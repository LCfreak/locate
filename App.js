import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Image, StyleSheet, Button } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Camera, CameraType } from 'expo-camera/legacy';
import * as Location from 'expo-location';
import axios from 'axios';

const serverUrl = 'http://192.168.101.2:8082/gps-data'; // replace with your laptop's IP address

export default function App() {
  const [location, setLocation] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [hasCameraPermission, setHasCameraPermission] = useState(null);
  const [camera, setCamera] = useState(null);
  const [image, setImage] = useState(null);
  const [type, setType] = useState(CameraType.back);
  const cameraRef = useRef(null);

  useEffect(() => {
    const getPermissions = async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.log("Please grant location permission");
        } else {
          const subscription = await Location.watchPositionAsync({
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 1000, // update location every 1 second
            distanceInterval: 10, // update location every 10 meters
          }, (location) => {
            setLocation(location);
            console.log("Location:");
            console.log(location);

            // Send location to server
            axios.post(serverUrl, {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            })
              .then((response) => {
                console.log('Location sent to server:', response);
              })
              .catch((error) => {
                console.error('Error sending location to server:', error);
              });
          });

          setSubscription(subscription);
        }
      } catch (error) {
        console.error("Error requesting permissions: ", error);
      }
    };
    getPermissions();

    return () => {
      // Clean up the subscription when the component unmounts
      if (subscription) {
        subscription.remove();
      }
    };
  }, []);

  useEffect(() => {
    (async () => {
      const cameraStatus = await Camera.requestCameraPermissionsAsync();
      setHasCameraPermission(cameraStatus.status === 'granted');
    })();
  }, []);

  const takePicture = async () => {
    if (cameraRef.current) {
      const data = await cameraRef.current.takePictureAsync(null);
      setImage(data.uri);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.cameraContainer}>
        {hasCameraPermission ? (
          <Camera
            ref={cameraRef}
            style={styles.fixedRatio}
            type={type}
            ratio={'1:1'}
          />
        ) : (
          <Button title="Grant Camera Permission" onPress={() => {
            (async () => {
              const cameraStatus = await Camera.requestCameraPermissionsAsync();
              setHasCameraPermission(cameraStatus.status === 'granted');
            })();
          }} />
        )}
      </View>
      <View style={styles.container}>
        <Text style={styles.locationText}>
          Latitude: {location ? location.coords.latitude : 'Unknown'}
          Longitude: {location ? location.coords.longitude : 'Unknown'}
        </Text>
        <Button title="Take Picture"
        onPress={() => takePicture()} />
        {image && <Image source={{ uri: image }} style={{ flex: 1 }} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cameraContainer: {
    flex: 1,
    flexDirection: 'row'
  },
  fixedRatio: {
    flex: 1,
    aspectRatio: 1
  },
  locationText: {
    fontSize: 18,
    marginBottom: 20
  }
});