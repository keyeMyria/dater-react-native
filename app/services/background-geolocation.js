import * as RNBackgroundGeolocation from 'react-native-background-geolocation';
import firebase from 'react-native-firebase';
import DeviceInfo from 'react-native-device-info';
import { Platform } from 'react-native';

import { geoActionCreators } from '../redux/index';
import { GeoCoordinates } from '../types/index';

const geoOptions = async () => {
  const { currentUser } = firebase.auth();
  const firebaseAuthToken = currentUser ? await currentUser.getIdToken() : null;
  const uid = currentUser ? currentUser.uid : 'unknown';

  return {
    useSignificantChanges: false,
    enableHighAccuracy: true,
    maximumAge: 1000,
    distanceFilter: 2,
    desiredAccuracy: RNBackgroundGeolocation.DESIRED_ACCURACY_HIGH,
    stopTimeout: 1,
    debug: true, // <-- enable this hear sounds for background-geolocation life-cycle.
    logLevel: RNBackgroundGeolocation.LOG_LEVEL_VERBOSE,
    stopOnTerminate: false, // <-- Allow the background-service to continue tracking when user closes the app.
    enableHeadless: true, // <-- Android Headless mode
    foregroundService: false, // <-- Android, enforced to true on Android 8
    startOnBoot: true, // <-- Auto start tracking when device is powered-up.
    batchSync: false, // <-- [Default: false] Set true to sync locations to server in a single HTTP request.
    autoSync: true, // <-- [Default: true] Set true to sync each location to server as it arrives.
    url: `https://dater-geolocation-console.herokuapp.com/locations/${uid}`,
    notificationPriority: RNBackgroundGeolocation.NOTIFICATION_PRIORITY_LOW,
    notificationTitle: 'Dater.com',
    notificationText: 'Dater Mode ON',
    params: {
      device: {
        platform: Platform.OS,
        version: DeviceInfo.getSystemVersion(),
        uuid: DeviceInfo.getUniqueID(),
        model: DeviceInfo.getModel(),
        manufacturer: DeviceInfo.getManufacturer(),
      },
    },
    extras: {
      uid,
      firebaseAuthToken,
    },
  };
};


const updateGeoPointInFirestore = (options: {
  uid: string,
  apiKey: string,
  coords: GeoCoordinates,
}) => {
  const fireStoreUrl = 'https://firestore.googleapis.com/v1beta1/projects/dater3-dev/databases/(default)/documents';
  const patchUrl = `${fireStoreUrl}/geoPoints/${options.uid}?currentDocument.exists=true&` +
    'updateMask.fieldPaths=geoPoint&' +
    'updateMask.fieldPaths=speed&' +
    'updateMask.fieldPaths=accuracy&' +
    'updateMask.fieldPaths=heading&' +
    `key=${options.apiKey}`;

  return fetch(patchUrl, {
    method: 'PATCH',
    body: JSON.stringify({
      fields: {
        geoPoint: {
          geoPointValue: {
            latitude: options.coords.latitude,
            longitude: options.coords.longitude,
          },
        },
        speed: {
          doubleValue: options.coords.speed,
        },
        accuracy: {
          doubleValue: options.coords.accuracy,
        },
        heading: {
          doubleValue: options.coords.heading,
        },
      },
    }),
  })
    .then((response) => {
      if (response.status !== 200) {
        console.error('Error while patching firestore in updateGeoPointInFirestore: ', response);
      }
    })
    .catch((err) => console.error(err));
};

const toggleBgServices = (dispatch) => {
  RNBackgroundGeolocation.getState((state) => {
    if (state.enabled) {
      RNBackgroundGeolocation.stop(() => (dispatch(geoActionCreators.stopBgServices())));
    } else {
      RNBackgroundGeolocation.start(() => (dispatch(geoActionCreators.startBgServices())));
    }
  });
};

const BackgroundGeolocation = {
  init: async () => {
    const GEO_OPTIONS = await geoOptions();
    const bgServiceState = await new Promise((resolve, reject) => {
      RNBackgroundGeolocation.configure(GEO_OPTIONS, (state) => {
        resolve(state);
      }, (error) => reject(error));
    });

    return bgServiceState;
  },
  start: () => (
    new Promise((resolve, reject) => {
      RNBackgroundGeolocation.start(() => resolve(), (error) => reject(error));
    })),
  stop: () => (
    new Promise((resolve, reject) => {
      RNBackgroundGeolocation.stop(() => resolve(), (error) => reject(error));
    })),
  changePace: (value: boolean) => (
    new Promise((resolve, reject) => {
      RNBackgroundGeolocation.changePace(value, () => resolve(), (error) => reject(error));
    })),
  getCurrentPosition: async () => {
    console.log('Getting geo position manually in getGeoPosition');
    const GEO_OPTIONS = await geoOptions();
    return new Promise((resolve, reject) => {
      RNBackgroundGeolocation.getCurrentPosition(
        GEO_OPTIONS,
        (position) => resolve(position),
        (error) => reject(error),
      );
    });
  },
  updateGeoPointInFirestore,
  toggleBgServices,
};

export default BackgroundGeolocation;