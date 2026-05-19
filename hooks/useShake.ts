import { Accelerometer } from 'expo-sensors';
import { useEffect } from 'react';
import { Vibration } from 'react-native';

// Detecta una sacudida fisica del dispositivo y ejecuta un callback con vibracion.
export const useShake = (onShake: () => void) => {
  useEffect(() => {
    let lastShakeTime = 0;

    Accelerometer.setUpdateInterval(100);

    const subscription = Accelerometer.addListener(accelerometerData => {
      const { x, y, z } = accelerometerData;

      const acceleration = Math.sqrt(x * x + y * y + z * z);

      const SHAKE_THRESHOLD = 3.0;

      const TIME_THRESHOLD = 1000;

      if (acceleration > SHAKE_THRESHOLD) {
        const now = Date.now();
        if (now - lastShakeTime > TIME_THRESHOLD) {
          lastShakeTime = now;
          Vibration.vibrate(400);
          onShake();
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [onShake]);
};
