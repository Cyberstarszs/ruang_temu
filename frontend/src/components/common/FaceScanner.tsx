'use client';

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from 'react';
import {
  Camera,
  Upload,
  RotateCcw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

export interface FaceCaptureResult {
  descriptor: number[];
  photoBase64: string;
  distance?: number;
}

export interface FaceDetectionStatus {
  modelsLoaded: boolean;
  cameraReady: boolean;
  faceDetected: boolean;
  faceMatched: boolean | null; // null when no reference descriptor
  distance: number | null;
  similarityPct: number | null;
  hint: string | null;
  error: string | null;
}

export interface FaceScannerHandle {
  capture: () => Promise<FaceCaptureResult | null>;
  restartCamera: () => void;
}

interface FaceScannerProps {
  mode: 'enroll' | 'verify';
  referenceDescriptor?: number[] | null;
  initialPhotoUrl?: string | null;
  onCapture?: (result: FaceCaptureResult) => void;
  onStatusChange?: (status: FaceDetectionStatus) => void;
  height?: number;
}

const MATCH_THRESHOLD = 0.58;
const CAMERA_INIT_TIMEOUT_MS = 12000;
let faceApiLoadPromise: Promise<any> | null = null;

async function getLoadedFaceApi() {
  const faceapi = await import('@vladmandic/face-api');
  if (!faceApiLoadPromise) {
    faceApiLoadPromise = (async () => {
      const modelUrl = '/models/face-api';
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(modelUrl),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri(modelUrl),
        faceapi.nets.faceRecognitionNet.loadFromUri(modelUrl),
      ]);
      return faceapi;
    })().catch((err) => {
      faceApiLoadPromise = null;
      throw err;
    });
  }
  return faceApiLoadPromise;
}

function euclidean(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

function averageDescriptors(list: number[][]): number[] {
  if (list.length === 1) return list[0];
  const len = list[0].length;
  const out = new Array<number>(len).fill(0);
  for (const vec of list) {
    for (let i = 0; i < len; i++) {
      out[i] += vec[i];
    }
  }
  for (let i = 0; i < len; i++) {
    out[i] = Number((out[i] / list.length).toFixed(6));
  }
  return out;
}

function measureVideoBrightness(video: HTMLVideoElement): number {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 48;
    canvas.height = 36;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return 128;
    ctx.drawImage(video, 0, 0, 48, 36);
    const data = ctx.getImageData(8, 6, 32, 24).data;
    let total = 0;
    const pixels = data.length / 4;
    for (let i = 0; i < data.length; i += 4) {
      total += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }
    return total / pixels;
  } catch {
    return 128;
  }
}

function toSimilarityPct(distance: number): number {
  // Distance 0.0 -> 100%, 0.55 -> ~55%, >= 1.1 -> 0%
  return Math.max(0, Math.min(99, Math.round((1 - distance / 1.1) * 100)));
}

export const FaceScanner = forwardRef<FaceScannerHandle, FaceScannerProps>(function FaceScanner(
  { mode, referenceDescriptor, initialPhotoUrl, onCapture, onStatusChange, height = 240 },
  ref
) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mountedRef = useRef<boolean>(true);
  const runIdRef = useRef<number>(0);

  // Refs prevent re-render & dependency loops on parent updates (like 1s clocks)
  const onStatusChangeRef = useRef(onStatusChange);
  const onCaptureRef = useRef(onCapture);
  const referenceDescriptorRef = useRef(referenceDescriptor);
  onStatusChangeRef.current = onStatusChange;
  onCaptureRef.current = onCapture;
  referenceDescriptorRef.current = referenceDescriptor;

  const descriptorBufferRef = useRef<Array<{ vec: number[]; ts: number }>>([]);
  const noFaceStreakRef = useRef<number>(0);

  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [faceMatched, setFaceMatched] = useState<boolean | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [similarityPct, setSimilarityPct] = useState<number | null>(null);
  const [framingHint, setFramingHint] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(initialPhotoUrl || null);
  const [isScanningActive, setIsScanningActive] = useState(mode === 'verify' || !initialPhotoUrl);
  const [isProcessingCapture, setIsProcessingCapture] = useState(false);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [restartNonce, setRestartNonce] = useState(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Sync initialPhotoUrl if user changes
  useEffect(() => {
    setCapturedPreview(initialPhotoUrl || null);
    if (mode === 'enroll') {
      setIsScanningActive(!initialPhotoUrl);
    }
  }, [initialPhotoUrl, mode]);

  const emitStatus = useCallback((next: FaceDetectionStatus) => {
    onStatusChangeRef.current?.(next);
  }, []);

  const stopCamera = useCallback(() => {
    runIdRef.current += 1;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {}
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    descriptorBufferRef.current = [];
    setCameraReady(false);
    setFaceDetected(false);
    setFaceMatched(null);
    setDistance(null);
    setSimilarityPct(null);
    setFramingHint(null);
  }, []);

  const startCamera = useCallback(async (deviceIdOverride?: string) => {
    const myRunId = ++runIdRef.current;
    setCameraError(null);
    setFramingHint(null);

    try {
      if (typeof window !== 'undefined' && !window.isSecureContext) {
        const secMsg = 'Akses kamera memerlukan HTTPS atau dibuka melalui localhost.';
        if (mountedRef.current && runIdRef.current === myRunId) {
          setCameraError(secMsg);
          emitStatus({
            modelsLoaded: false,
            cameraReady: false,
            faceDetected: false,
            faceMatched: null,
            distance: null,
            similarityPct: null,
            hint: secMsg,
            error: secMsg,
          });
        }
        return;
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        const unsupMsg = 'Browser tidak mendukung akses kamera.';
        if (mountedRef.current && runIdRef.current === myRunId) {
          setCameraError(unsupMsg);
        }
        return;
      }

      await getLoadedFaceApi();
      if (!mountedRef.current || runIdRef.current !== myRunId) return;
      setModelsLoaded(true);

      const videoConstraint: MediaTrackConstraints = deviceIdOverride
        ? { deviceId: { exact: deviceIdOverride }, width: { ideal: 640 }, height: { ideal: 480 } }
        : { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } };

      let timedOut = false;
      const stream = await new Promise<MediaStream>((resolve, reject) => {
        const timer = setTimeout(() => {
          timedOut = true;
          reject({ name: 'CameraTimeoutError' });
        }, CAMERA_INIT_TIMEOUT_MS);

        navigator.mediaDevices
          .getUserMedia({ video: videoConstraint, audio: false })
          .then((s) => {
            clearTimeout(timer);
            if (timedOut) {
              s.getTracks().forEach((t) => {
                try {
                  t.stop();
                } catch {}
              });
              return;
            }
            resolve(s);
          })
          .catch((e) => {
            clearTimeout(timer);
            if (!timedOut) reject(e);
          });
      });

      // If closed/cancelled while awaiting permission, release camera immediately!
      if (!mountedRef.current || runIdRef.current !== myRunId) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = stream;

      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await new Promise<void>((resolve) => {
          const onReady = () => {
            video.removeEventListener('loadedmetadata', onReady);
            resolve();
          };
          if (video.readyState >= 1) {
            resolve();
          } else {
            video.addEventListener('loadedmetadata', onReady);
            setTimeout(resolve, 1200);
          }
        });
        await video.play().catch(() => {});
      }

      if (!mountedRef.current || runIdRef.current !== myRunId) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      // Discover available cameras for optional switch button
      if (navigator.mediaDevices.enumerateDevices) {
        navigator.mediaDevices
          .enumerateDevices()
          .then((devs) => {
            if (!mountedRef.current) return;
            const cams = devs.filter((d) => d.kind === 'videoinput');
            setVideoDevices(cams);
            if (!deviceIdOverride && cams.length > 0 && !selectedDeviceId) {
              const activeTrack = stream.getVideoTracks()[0];
              const activeId = activeTrack?.getSettings?.().deviceId || cams[0].deviceId;
              setSelectedDeviceId(activeId);
            }
          })
          .catch(() => {});
      }

      setCameraReady(true);
      emitStatus({
        modelsLoaded: true,
        cameraReady: true,
        faceDetected: false,
        faceMatched: null,
        distance: null,
        similarityPct: null,
        hint: null,
        error: null,
      });
    } catch (err: any) {
      if (!mountedRef.current || runIdRef.current !== myRunId) return;
      const msg =
        err?.name === 'CameraTimeoutError'
          ? 'Kamera menunggu izin akses. Klik ikon kamera di bar alamat browser untuk mengizinkan, lalu klik Muat Ulang Kamera.'
          : err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError'
          ? 'Izin kamera ditolak. Izinkan kamera di pengaturan browser.'
          : err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError'
          ? 'Perangkat kamera tidak ditemukan.'
          : err?.name === 'NotReadableError' || err?.name === 'TrackStartError'
          ? 'Kamera sedang digunakan aplikasi lain. Tutup aplikasi lain lalu Muat Ulang.'
          : 'Gagal mengaktifkan kamera pemindai wajah.';
      setCameraError(msg);
      emitStatus({
        modelsLoaded,
        cameraReady: false,
        faceDetected: false,
        faceMatched: null,
        distance: null,
        similarityPct: null,
        hint: msg,
        error: msg,
      });
    }
  }, [emitStatus, modelsLoaded, selectedDeviceId]);

  useEffect(() => {
    if (isScanningActive) {
      startCamera(selectedDeviceId || undefined);
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
    // Only re-run camera setup when active state, selected device, or explicit restart changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isScanningActive, selectedDeviceId, restartNonce]);

  // Continuous smart face detection & quality loop
  useEffect(() => {
    if (!isScanningActive || !modelsLoaded || !cameraReady) return;
    let cancelled = false;

    const runLoop = async () => {
      const faceapi = await getLoadedFaceApi();
      while (!cancelled && mountedRef.current) {
        if (typeof document !== 'undefined' && document.hidden) {
          await new Promise((r) => setTimeout(r, 500));
          continue;
        }

        const video = videoRef.current;
        if (video && video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
          try {
            const det = await faceapi
              .detectSingleFace(
                video,
                new faceapi.TinyFaceDetectorOptions({ inputSize: 256, scoreThreshold: 0.38 })
              )
              .withFaceLandmarks(true)
              .withFaceDescriptor();

            if (cancelled || !mountedRef.current) break;

            if (det && det.descriptor) {
              noFaceStreakRef.current = 0;
              const box = det.detection.box;
              const widthRatio = box.width / video.videoWidth;
              const centerX = (box.x + box.width / 2) / video.videoWidth;
              const centerY = (box.y + box.height / 2) / video.videoHeight;

              let hint: string | null = null;
              if (widthRatio < 0.17) {
                hint = 'Dekatkan wajah ke kamera';
              } else if (centerX < 0.22 || centerX > 0.78 || centerY < 0.18 || centerY > 0.85) {
                hint = 'Posisikan wajah di tengah bingkai';
              }

              const rawVec = Array.from(det.descriptor) as number[];
              const now = Date.now();
              const freshBuf = descriptorBufferRef.current.filter((item) => now - item.ts < 1500);
              freshBuf.push({ vec: rawVec, ts: now });
              if (freshBuf.length > 3) freshBuf.shift();
              descriptorBufferRef.current = freshBuf;

              const smoothedVec = averageDescriptors(freshBuf.map((b) => b.vec));
              const refDesc = referenceDescriptorRef.current;

              let matched: boolean | null = null;
              let dist: number | null = null;
              let sim: number | null = null;

              if (refDesc && refDesc.length === 128) {
                dist = Number(euclidean(smoothedVec, refDesc).toFixed(3));
                matched = dist <= MATCH_THRESHOLD;
                sim = toSimilarityPct(dist);
              }

              setFaceDetected(true);
              setFaceMatched(matched);
              setDistance(dist);
              setSimilarityPct(sim);
              setFramingHint(hint);

              emitStatus({
                modelsLoaded: true,
                cameraReady: true,
                faceDetected: true,
                faceMatched: matched,
                distance: dist,
                similarityPct: sim,
                hint,
                error: null,
              });
            } else {
              noFaceStreakRef.current += 1;
              if (noFaceStreakRef.current > 3) {
                descriptorBufferRef.current = [];
              }

              let hint: string | null = null;
              if (noFaceStreakRef.current >= 4) {
                const brightness = measureVideoBrightness(video);
                if (brightness < 38) {
                  hint = 'Cahaya terlalu redup — tambahkan pencahayaan';
                }
              }

              setFaceDetected(false);
              setFaceMatched(null);
              setDistance(null);
              setSimilarityPct(null);
              setFramingHint(hint);

              emitStatus({
                modelsLoaded: true,
                cameraReady: true,
                faceDetected: false,
                faceMatched: null,
                distance: null,
                similarityPct: null,
                hint,
                error: null,
              });
            }
          } catch {
            // transient video frame decode skip
          }
        }
        await new Promise((r) => setTimeout(r, 300));
      }
    };

    runLoop();
    return () => {
      cancelled = true;
    };
  }, [isScanningActive, modelsLoaded, cameraReady, emitStatus]);

  const grabPhotoAndDescriptor = useCallback(async (): Promise<FaceCaptureResult | null> => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || video.videoWidth === 0) return null;

    const faceapi = await getLoadedFaceApi();
    let det: any = null;

    // Up to 2 high-res detection attempts so blinks/motion don't cause false failures
    for (let attempt = 0; attempt < 2; attempt++) {
      det = await faceapi
        .detectSingleFace(
          video,
          new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.38 })
        )
        .withFaceLandmarks(true)
        .withFaceDescriptor();
      if (det?.descriptor) break;
      await new Promise((r) => setTimeout(r, 150));
    }

    const now = Date.now();
    const recent = descriptorBufferRef.current
      .filter((item) => now - item.ts < 1500)
      .map((item) => item.vec);

    let finalDescriptor: number[] | null = null;
    if (det?.descriptor) {
      finalDescriptor = averageDescriptors([...recent.slice(-2), Array.from(det.descriptor) as number[]]);
    } else if (recent.length > 0) {
      finalDescriptor = averageDescriptors(recent);
    }

    if (!finalDescriptor || finalDescriptor.length !== 128) {
      return null;
    }

    const canvas = document.createElement('canvas');
    const vw = video.videoWidth || 640;
    const vh = video.videoHeight || 480;
    const maxW = 540;
    const scale = vw > maxW ? maxW / vw : 1;
    canvas.width = Math.round(vw * scale);
    canvas.height = Math.round(vh * scale);
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    }
    const photoBase64 = canvas.toDataURL('image/jpeg', 0.8);

    const refDesc = referenceDescriptorRef.current;
    const dist =
      refDesc && refDesc.length === 128
        ? Number(euclidean(finalDescriptor, refDesc).toFixed(3))
        : undefined;

    return { descriptor: finalDescriptor, photoBase64, distance: dist };
  }, []);

  const handleRestartCamera = useCallback(() => {
    stopCamera();
    setRestartNonce((n) => n + 1);
  }, [stopCamera]);

  useImperativeHandle(
    ref,
    () => ({
      capture: grabPhotoAndDescriptor,
      restartCamera: handleRestartCamera,
    }),
    [grabPhotoAndDescriptor, handleRestartCamera]
  );

  const handleManualEnrollCapture = async () => {
    setIsProcessingCapture(true);
    setCameraError(null);
    try {
      const result = await grabPhotoAndDescriptor();
      if (!result) {
        setCameraError('Wajah belum terdeteksi jelas. Arahkan wajah ke tengah bingkai kamera.');
        return;
      }
      setCapturedPreview(result.photoBase64);
      setIsScanningActive(false);
      onCaptureRef.current?.(result);
    } finally {
      if (mountedRef.current) setIsProcessingCapture(false);
    }
  };

  const handleSwitchCamera = () => {
    if (videoDevices.length <= 1) return;
    const curIdx = videoDevices.findIndex((d) => d.deviceId === selectedDeviceId);
    const nextIdx = (curIdx + 1) % videoDevices.length;
    setSelectedDeviceId(videoDevices[nextIdx].deviceId);
  };

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessingCapture(true);
    setCameraError(null);

    try {
      const faceapi = await getLoadedFaceApi();
      setModelsLoaded(true);

      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const img = new Image();
        img.onload = async () => {
          try {
            // Downscale large phone photos onto canvas before inference for speed & low memory
            const inferCanvas = document.createElement('canvas');
            const maxInferW = 720;
            const inferScale = img.width > maxInferW ? maxInferW / img.width : 1;
            inferCanvas.width = Math.round(img.width * inferScale);
            inferCanvas.height = Math.round(img.height * inferScale);
            const inferCtx = inferCanvas.getContext('2d');
            inferCtx?.drawImage(img, 0, 0, inferCanvas.width, inferCanvas.height);

            const det = await faceapi
              .detectSingleFace(
                inferCanvas,
                new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.32 })
              )
              .withFaceLandmarks(true)
              .withFaceDescriptor();

            if (!det || !det.descriptor) {
              setCameraError('Wajah tidak ditemukan pada foto. Gunakan foto wajah yang jelas.');
              setIsProcessingCapture(false);
              return;
            }

            const canvas = document.createElement('canvas');
            const maxW = 540;
            const scale = img.width > maxW ? maxW / img.width : 1;
            canvas.width = Math.round(img.width * scale);
            canvas.height = Math.round(img.height * scale);
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
            const compressed = canvas.toDataURL('image/jpeg', 0.82);

            const result: FaceCaptureResult = {
              descriptor: Array.from(det.descriptor) as number[],
              photoBase64: compressed,
            };
            setCapturedPreview(compressed);
            setIsScanningActive(false);
            onCaptureRef.current?.(result);
          } finally {
            if (mountedRef.current) setIsProcessingCapture(false);
          }
        };
        img.onerror = () => {
          setCameraError('Gagal membaca file gambar.');
          setIsProcessingCapture(false);
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    } catch {
      setCameraError('Model pemindai wajah gagal dimuat.');
      setIsProcessingCapture(false);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const badgeText = cameraError
    ? 'Kamera Bermasalah'
    : !modelsLoaded
    ? 'Memuat model wajah...'
    : !cameraReady
    ? 'Menghubungkan kamera...'
    : !faceDetected
    ? framingHint || 'Arahkan wajah ke bingkai'
    : framingHint
    ? framingHint
    : faceMatched === true
    ? `Wajah Cocok (${similarityPct ?? 90}%) ✓`
    : faceMatched === false
    ? 'Wajah Tidak Cocok'
    : 'Wajah Terdeteksi ✓';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {mode === 'enroll' && capturedPreview && !isScanningActive ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            padding: '10px 12px',
            borderRadius: '10px',
            border: '1px solid #d4ded6',
            background: '#f6f8f5',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <img
              src={capturedPreview}
              alt="Foto wajah"
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '8px',
                objectFit: 'cover',
                border: '1px solid #ccd5cd',
                flexShrink: 0,
              }}
            />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12.5px', fontWeight: 700, color: '#15803d' }}>
                <CheckCircle2 size={14} />
                <span>Data Wajah Tersimpan</span>
              </div>
              <div style={{ fontSize: '11px', color: '#64746b', marginTop: '1px' }}>
                Siap digunakan untuk verifikasi absensi
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsScanningActive(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '6px 10px',
              borderRadius: '7px',
              border: '1px solid #dcdfd5',
              background: '#ffffff',
              color: '#374151',
              fontSize: '11.5px',
              fontWeight: 600,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <RotateCcw size={12} />
            Scan Ulang
          </button>
        </div>
      ) : (
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: `${height}px`,
            borderRadius: '12px',
            overflow: 'hidden',
            background: '#181c1a',
            border: `2px solid ${
              faceDetected && faceMatched !== false && !framingHint ? '#22c55e' : '#e2e4dc'
            }`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <video
            ref={videoRef}
            muted
            playsInline
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: 'scaleX(-1)',
              display: cameraError ? 'none' : 'block',
            }}
          />

          {/* Oval guide */}
          {!cameraError && cameraReady && (
            <div
              style={{
                position: 'absolute',
                width: '132px',
                height: '168px',
                borderRadius: '50%',
                border: `2px dashed ${
                  faceDetected && faceMatched !== false && !framingHint
                    ? '#4ade80'
                    : faceMatched === false
                    ? '#ef4444'
                    : 'rgba(255,255,255,0.55)'
                }`,
                pointerEvents: 'none',
                transition: 'border-color 0.2s ease',
              }}
            />
          )}

          {/* Top status badge */}
          <div
            style={{
              position: 'absolute',
              top: '10px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(17, 24, 22, 0.8)',
              color: '#ffffff',
              padding: '4px 10px',
              borderRadius: '999px',
              fontSize: '11px',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap',
              backdropFilter: 'blur(4px)',
              maxWidth: '90%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                flexShrink: 0,
                background: cameraError
                  ? '#ef4444'
                  : faceDetected
                  ? faceMatched === false
                    ? '#ef4444'
                    : framingHint
                    ? '#fbbf24'
                    : '#4ade80'
                  : '#fbbf24',
              }}
            />
            <span>{badgeText}</span>
          </div>

          {/* Camera switch / refresh corner controls */}
          {!cameraError && videoDevices.length > 1 && (
            <button
              type="button"
              onClick={handleSwitchCamera}
              title="Ganti Kamera"
              style={{
                position: 'absolute',
                bottom: '8px',
                right: '8px',
                padding: '5px 8px',
                borderRadius: '7px',
                border: 'none',
                background: 'rgba(17, 24, 22, 0.72)',
                color: '#ffffff',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <RefreshCw size={11} />
              <span>Kamera</span>
            </button>
          )}

          {cameraError && (
            <div style={{ padding: '16px', textAlign: 'center', color: '#e4e4e7', maxWidth: '300px' }}>
              <AlertCircle size={22} color="#f87171" style={{ margin: '0 auto 6px' }} />
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#fca5a5', marginBottom: '10px' }}>
                {cameraError}
              </div>
              <button
                type="button"
                onClick={handleRestartCamera}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '6px 12px',
                  borderRadius: '7px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'rgba(255,255,255,0.1)',
                  color: '#ffffff',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <RefreshCw size={12} />
                Muat Ulang Kamera
              </button>
            </div>
          )}
        </div>
      )}

      {/* Action buttons for enroll mode */}
      {mode === 'enroll' && isScanningActive && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            disabled={!cameraReady || !faceDetected || isProcessingCapture}
            onClick={handleManualEnrollCapture}
            style={{
              flex: 1,
              minWidth: '150px',
              height: '34px',
              borderRadius: '8px',
              border: 'none',
              background: !cameraReady || !faceDetected ? '#cbd5cc' : '#57695b',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: 600,
              cursor: !cameraReady || !faceDetected || isProcessingCapture ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            {isProcessingCapture ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
            <span>{isProcessingCapture ? 'Memindai...' : 'Ambil Foto Wajah'}</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleUploadPhoto}
            style={{ display: 'none' }}
          />
          <button
            type="button"
            disabled={isProcessingCapture}
            onClick={() => fileInputRef.current?.click()}
            style={{
              height: '34px',
              padding: '0 12px',
              borderRadius: '8px',
              border: '1px solid #dcdfd5',
              background: '#ffffff',
              color: '#4b5563',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <Upload size={13} />
            <span>Upload Foto</span>
          </button>

          {capturedPreview && (
            <button
              type="button"
              onClick={() => setIsScanningActive(false)}
              style={{
                height: '34px',
                padding: '0 10px',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                background: '#f9fafb',
                color: '#6b7280',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Batal
            </button>
          )}
        </div>
      )}
    </div>
  );
});
