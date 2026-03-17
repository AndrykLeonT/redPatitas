import { useState, useEffect } from 'react';
import { Accelerometer } from 'expo-sensors';
import { Vibration } from 'react-native';

export const useShake = (onShake: () => void) => {
  useEffect(() => {
    let lastShakeTime = 0;

    // We set a faster update interval to better catch quick shakes
    Accelerometer.setUpdateInterval(100);

    const subscription = Accelerometer.addListener(accelerometerData => {
      const { x, y, z } = accelerometerData;

      // Calculate the total acceleration magnitude
      const acceleration = Math.sqrt(x * x + y * y + z * z);
      
      // Standard gravity is 1g. A strong shake is usually > 1.8g
      // Lo bajaremos un poco a 1.5 para que sea más responsivo sin ser molesto
      const SHAKE_THRESHOLD = 1.5;
      
      // We debounce the shake event by 1 second to avoid multiple triggers for one shake
      const TIME_THRESHOLD = 1000;

      if (acceleration > SHAKE_THRESHOLD) {
        const now = Date.now();
        if (now - lastShakeTime > TIME_THRESHOLD) {
          lastShakeTime = now;
          Vibration.vibrate(400); // Dar feedback al usuario de que la acción de limpiado funcionó
          onShake();
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [onShake]);
};
