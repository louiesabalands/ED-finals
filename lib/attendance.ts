
import { supabase } from './supabase';
import { parseQRPayload } from './qr';
import { getEventByCode } from './events';

export type AttendanceRecord = {
  id: string;
  eventId: string;
  eventTitle: string;
  scannedAt: string;
};

export type RegisterResult = {
  success: boolean;
  message: string;
  eventTitle?: string;
};

export type TeacherEventAttendance = {
  eventId: string;
  eventCode: string;
  title: string;
  startTime: string | null;
  endTime: string | null;
  attendeeCount: number;
  attendees: {
    studentId: string;
    studentName: string | null;
    scannedAt: string;
  }[];
};

export type TeacherEventSummary = {
  eventId: string;
  eventCode: string;
  title: string;
  attendeeCount: number;
};

export async function registerAttendance(
  rawPayload: string,
  studentId: string
): Promise<RegisterResult> {
  try {
    // Check that a student ID is available.
    if (!studentId || studentId === 'unknown') {
      return {
        success: false,
        message: 'Please log in before scanning.',
      };
    }

    // Verify the currently authenticated user.
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        message: 'Your session has expired. Please log in again.',
      };
    }

    // Do not allow a different user ID to be submitted.
    if (user.id !== studentId) {
      return {
        success: false,
        message: 'Your account could not be verified.',
      };
    }

    // Parse the QR code.
    const parsed = parseQRPayload(rawPayload);

    if (!parsed.ok) {
      return {
        success: false,
        message: parsed.message,
      };
    }

    const payload = parsed.payload;
    const now = Date.now();

    // Check the event time included in the QR payload.
    const start = payload.start
      ? new Date(payload.start).getTime()
      : null;

    const end = payload.end
      ? new Date(payload.end).getTime()
      : null;

    if (start !== null && !Number.isNaN(start) && now < start) {
      return {
        success: false,
        message: 'Event has not started yet.',
      };
    }

    if (end !== null && !Number.isNaN(end) && now > end) {
      return {
        success: false,
        message: 'Event has already ended.',
      };
    }

    // Check that the account has the student role.
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError || !profile) {
      return {
        success: false,
        message: 'Could not verify your profile.',
      };
    }

    if (profile.role !== 'student') {
      return {
        success: false,
        message: 'Only student accounts can register attendance.',
      };
    }

    // Find the event. Students cannot create events by scanning.
    const event = await getEventByCode(payload.event);

    if (!event) {
      return {
        success: false,
        message: 'Event not found. Please check the QR code.',
      };
    }

    // Insert attendance for the authenticated student.
    const { error: attendanceError } = await supabase
      .from('attendance')
      .insert({
        student_id: user.id,
        event_id: event.id,
      });

    if (attendanceError) {
      if (attendanceError.code === '23505') {
        return {
          success: false,
          message: 'You are already registered for this event.',
          eventTitle: event.title,
        };
      }

      console.error('Attendance insert error:', attendanceError);

      if (attendanceError.code === '42501') {
        return {
          success: false,
          message:
            'Attendance was blocked by database security policy. Check your Supabase RLS policies.',
          eventTitle: event.title,
        };
      }

      return {
        success: false,
        message: attendanceError.message,
        eventTitle: event.title,
      };
    }

    return {
      success: true,
      message: 'Attendance recorded successfully!',
      eventTitle: event.title,
    };
  } catch (error) {
    console.error('Register attendance error:', error);

    return {
      success: false,
      message: 'Something went wrong while registering attendance.',
    };
  }
}

export async function getAttendanceHistory(
  studentId: string
): Promise<AttendanceRecord[]> {
  const { data, error } = await supabase
    .from('attendance')
    .select('id, scanned_at, event_id, events ( event_code, title )')
    .eq('student_id', studentId)
    .order('scanned_at', { ascending: false });

  if (error || !data) {
    console.error('Attendance history error:', error);
    return [];
  }

  return data.map((row: any) => ({
    id: row.id,
    eventId: row.event_id,
    eventTitle: row.events?.title ?? '',
    scannedAt: row.scanned_at,
  }));
}

export async function getTeacherEventAttendance(
  teacherId: string
): Promise<TeacherEventAttendance[]> {
  const { data: events, error: eventError } = await supabase
    .from('events')
    .select('id, event_code, title, start_time, end_time')
    .eq('created_by', teacherId)
    .order('created_at', { ascending: false });

  if (eventError || !events) {
    console.error('Teacher events error:', eventError);
    return [];
  }

  if (events.length === 0) {
    return [];
  }

  const eventIds = events.map((event) => event.id);

  const { data: attendance, error: attendanceError } = await supabase
    .from('attendance')
    .select('student_id, scanned_at, event_id')
    .in('event_id', eventIds)
    .order('scanned_at', { ascending: false });

  if (attendanceError) {
    console.error('Teacher attendance error:', attendanceError);
    return [];
  }

  const rows = attendance ?? [];
  const studentIds = [...new Set(rows.map((row) => row.student_id))];

  const profileMap: Record<string, string | null> = {};

  if (studentIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', studentIds);

    if (profilesError) {
      console.error('Student profiles error:', profilesError);
    }

    for (const profile of profiles ?? []) {
      profileMap[profile.id] = profile.full_name ?? null;
    }
  }

  return events.map((event) => {
    const eventRows = rows.filter(
      (row) => row.event_id === event.id
    );

    return {
      eventId: event.id,
      eventCode: event.event_code,
      title: event.title,
      startTime: event.start_time,
      endTime: event.end_time,
      attendeeCount: eventRows.length,
      attendees: eventRows.map((row) => ({
        studentId: row.student_id,
        studentName: profileMap[row.student_id] ?? null,
        scannedAt: row.scanned_at,
      })),
    };
  });
}

export async function getTeacherEventSummary(
  teacherId: string
): Promise<TeacherEventSummary[]> {
  const { data: events, error: eventError } = await supabase
    .from('events')
    .select('id, event_code, title')
    .eq('created_by', teacherId)
    .order('created_at', { ascending: false });

  if (eventError || !events) {
    console.error('Teacher event summary error:', eventError);
    return [];
  }

  if (events.length === 0) {
    return [];
  }

  const eventIds = events.map((event) => event.id);

  const { data: attendance, error: attendanceError } = await supabase
    .from('attendance')
    .select('event_id')
    .in('event_id', eventIds);

  if (attendanceError) {
    console.error('Attendance count error:', attendanceError);
    return [];
  }

  const counts: Record<string, number> = {};

  for (const row of attendance ?? []) {
    counts[row.event_id] = (counts[row.event_id] ?? 0) + 1;
  }

  return events.map((event) => ({
    eventId: event.id,
    eventCode: event.event_code,
    title: event.title,
    attendeeCount: counts[event.id] ?? 0,
  }));
}