
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import AppButton from '@/components/AppButton';
import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { registerAttendance } from '@/lib/attendance';

export default function ScanScreen() {
  const { user } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();

  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [lastData, setLastData] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (scanned || processing) return;

    setScanned(true);
    setProcessing(true);
    setLastData(data);
    setMessage(null);
    setSuccess(false);

    if (!user?.id) {
      setMessage('Please log in before scanning.');
      setProcessing(false);
      return;
    }

    try {
      const result = await registerAttendance(data, user.id);

      setMessage(result.message);
      setSuccess(result.success);
    } catch (error) {
      console.error('Attendance registration error:', error);
      setMessage(
        error instanceof Error
          ? error.message
          : 'Unable to register attendance. Please try again.'
      );
      setSuccess(false);
    } finally {
      setProcessing(false);
    }
  };

  const handleScanAgain = () => {
    setScanned(false);
    setProcessing(false);
    setLastData(null);
    setMessage(null);
    setSuccess(false);
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.textPrimary} />
        <Text style={styles.subtitle}>Checking camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <View style={styles.permissionCard}>
          <Text style={styles.cameraIcon}>📷</Text>
          <Text style={styles.title}>Camera Permission Needed</Text>
          <Text style={styles.subtitle}>
            Allow camera access to scan the attendance QR code.
          </Text>

          <AppButton
            theme="primary"
            title="Grant Permission"
            icon="camera"
            onPress={requestPermission}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
      />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>QR Attendance</Text>
        <Text style={styles.headerSubtitle}>
          Scan your teacher's QR code to record attendance
        </Text>
      </View>

      <View style={styles.scanFrameContainer}>
        <View style={styles.scanFrame}>
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
        </View>
      </View>

      <View style={styles.overlay}>
        <Text style={styles.overlayText}>
          {processing
            ? 'Registering attendance...'
            : scanned
              ? 'QR code detected'
              : 'Point your camera at a QR code'}
        </Text>

        {processing && (
          <ActivityIndicator
            size="small"
            color={COLORS.textPrimary}
            style={styles.loader}
          />
        )}

        {message && (
          <View
            style={[
              styles.resultBox,
              success ? styles.successBox : styles.errorBox,
            ]}
          >
            <Text
              style={[
                styles.scanResult,
                success ? styles.successText : styles.errorText,
              ]}
            >
              {message}
            </Text>
          </View>
        )}

        {scanned && lastData && (
          <Text style={styles.scanData} numberOfLines={3}>
            Scanned data: {lastData}
          </Text>
        )}

        {scanned && !processing && (
          <View style={styles.buttonContainer}>
            <AppButton
              theme="primary"
              title="Scan Again"
              icon="refresh"
              onPress={handleScanAgain}
            />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  permissionCard: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    backgroundColor: COLORS.card,
    padding: 24,
    borderRadius: 20,
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  header: {
    position: 'absolute',
    top: 55,
    left: 20,
    right: 20,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    padding: 16,
    borderRadius: 14,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#EEEEEE',
    textAlign: 'center',
  },
  scanFrameContainer: {
    position: 'absolute',
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#FFFFFF',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 5,
    borderLeftWidth: 5,
    borderTopLeftRadius: 12,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 5,
    borderRightWidth: 5,
    borderTopRightRadius: 12,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 5,
    borderLeftWidth: 5,
    borderBottomLeftRadius: 12,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 5,
    borderRightWidth: 5,
    borderBottomRightRadius: 12,
  },
  overlay: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 35,
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
    elevation: 5,
  },
  overlayText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  loader: {
    marginVertical: 8,
  },
  resultBox: {
    width: '100%',
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
  },
  successBox: {
    backgroundColor: '#E8F5E9',
  },
  errorBox: {
    backgroundColor: '#FFEBEE',
  },
  scanResult: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  successText: {
    color: '#2E7D32',
  },
  errorText: {
    color: '#C62828',
  },
  scanData: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 10,
  },
  buttonContainer: {
    width: '100%',
    marginTop: 12,
  },
  cameraIcon: {
    fontSize: 42,
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 18,
  },
});