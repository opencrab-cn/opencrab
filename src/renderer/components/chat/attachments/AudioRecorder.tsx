/**
 * 音频录制组件
 * 
 * 使用 MediaRecorder API 录音
 * 支持开始/暂停/停止
 */

import React, { useState, useRef, useEffect } from 'react';

/**
 * 组件属性
 */
interface AudioRecorderProps {
  /** 录制完成回调 */
  onRecordingComplete: (blob: Blob) => void;
  /** 取消录制回调 */
  onCancel?: () => void;
  /** 最长录制时间（秒） */
  maxDuration?: number;
}

/**
 * 录音状态
 */
type RecorderState = 'idle' | 'recording' | 'paused' | 'stopped';

/**
 * 音频录制组件
 */
export const AudioRecorder: React.FC<AudioRecorderProps> = ({
  onRecordingComplete,
  onCancel,
  maxDuration = 300, // 5 分钟
}) => {
  // 录音状态
  const [state, setState] = useState<RecorderState>('idle');
  // 录音时长
  const [duration, setDuration] = useState(0);
  // 错误信息
  const [error, setError] = useState<string | null>(null);
  // MediaRecorder 引用
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  // 音频块引用
  const chunksRef = useRef<Blob[]>([]);
  // 计时器引用
  const timerRef = useRef<number | null>(null);
  // 开始时间引用
  const startTimeRef = useRef<number>(0);

  /**
   * 清理计时器
   */
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  /**
   * 格式化时间
   */
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  /**
   * 开始录音
   */
  const startRecording = async () => {
    try {
      // 请求麦克风权限
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });

      // 创建 MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      // 数据可用事件
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      // 录音停止事件
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        onRecordingComplete(blob);
        
        // 清理流
        stream.getTracks().forEach(track => track.stop());
      };

      // 错误处理
      mediaRecorder.onerror = (event) => {
        console.error('[AudioRecorder] 录音错误:', event);
        setError('录音失败，请重试');
        stopRecording();
      };

      // 开始录音
      mediaRecorder.start(1000); // 每秒触发一次 dataavailable
      setState('recording');
      startTimeRef.current = Date.now();
      setDuration(0);

      // 启动计时器
      timerRef.current = window.setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setDuration(elapsed);

        // 达到最长时间自动停止
        if (elapsed >= maxDuration) {
          stopRecording();
        }
      }, 1000);

    } catch (err) {
      console.error('[AudioRecorder] 无法访问麦克风:', err);
      setError('无法访问麦克风，请检查权限设置');
      setState('idle');
    }
  };

  /**
   * 暂停录音
   */
  const pauseRecording = () => {
    if (mediaRecorderRef.current && state === 'recording') {
      mediaRecorderRef.current.pause();
      setState('paused');
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  /**
   * 恢复录音
   */
  const resumeRecording = () => {
    if (mediaRecorderRef.current && state === 'paused') {
      mediaRecorderRef.current.resume();
      setState('recording');
      // 调整开始时间
      startTimeRef.current = Date.now() - duration * 1000;
      timerRef.current = window.setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setDuration(elapsed);
        if (elapsed >= maxDuration) {
          stopRecording();
        }
      }, 1000);
    }
  };

  /**
   * 停止录音
   */
  const stopRecording = () => {
    if (mediaRecorderRef.current && state !== 'stopped') {
      mediaRecorderRef.current.stop();
      setState('stopped');
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  /**
   * 取消录音
   */
  const cancelRecording = () => {
    stopRecording();
    
    // 清理流
    if (mediaRecorderRef.current) {
      const stream = mediaRecorderRef.current.stream;
      stream.getTracks().forEach(track => track.stop());
    }
    
    chunksRef.current = [];
    setState('idle');
    setDuration(0);
    setError(null);
    
    onCancel?.();
  };

  /**
   * 渲染控制按钮
   */
  const renderControls = () => {
    if (state === 'idle') {
      return (
        <button
          onClick={startRecording}
          className="audio-recorder__button audio-recorder__button--start"
          title="开始录音"
        >
          🎤 开始录音
        </button>
      );
    }

    if (state === 'recording') {
      return (
        <div className="audio-recorder__controls">
          <button
            onClick={pauseRecording}
            className="audio-recorder__button audio-recorder__button--pause"
            title="暂停录音"
          >
            ⏸️
          </button>
          <button
            onClick={stopRecording}
            className="audio-recorder__button audio-recorder__button--stop"
            title="停止录音"
          >
            ⏹️
          </button>
          <button
            onClick={cancelRecording}
            className="audio-recorder__button audio-recorder__button--cancel"
            title="取消录音"
          >
            ✕
          </button>
        </div>
      );
    }

    if (state === 'paused') {
      return (
        <div className="audio-recorder__controls">
          <button
            onClick={resumeRecording}
            className="audio-recorder__button audio-recorder__button--resume"
            title="继续录音"
          >
            ▶️
          </button>
          <button
            onClick={stopRecording}
            className="audio-recorder__button audio-recorder__button--stop"
            title="停止录音"
          >
            ⏹️
          </button>
          <button
            onClick={cancelRecording}
            className="audio-recorder__button audio-recorder__button--cancel"
            title="取消录音"
          >
            ✕
          </button>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="audio-recorder">
      {/* 状态指示器 */}
      <div className={`audio-recorder__indicator audio-recorder__indicator--${state}`}>
        {state === 'recording' && (
          <span className="audio-recorder__dot"></span>
        )}
        <span className="audio-recorder__time">{formatTime(duration)}</span>
        <span className="audio-recorder__limit">/ {formatTime(maxDuration)}</span>
      </div>

      {/* 控制按钮 */}
      {renderControls()}

      {/* 错误提示 */}
      {error && (
        <div className="audio-recorder__error">
          ⚠️ {error}
        </div>
      )}

      {/* 提示信息 */}
      {state === 'idle' && (
        <p className="audio-recorder__hint">
          点击开始录音，再次点击停止
        </p>
      )}
    </div>
  );
};

export default AudioRecorder;
