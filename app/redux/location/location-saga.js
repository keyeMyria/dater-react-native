import { takeEvery, select, take, put, cancel, all, fork, actionChannel, takeLeading } from 'redux-saga/effects';
import { eventChannel } from 'redux-saga';
import firebase from 'react-native-firebase';
import BackgroundGeolocation from 'react-native-background-geolocation';

import {
  USERS_AROUND_SEARCH_RADIUS_KM,
  GEO_POINTS_COLLECTION,
  GOOD_GPS_ACCURACY_GENERAL,
} from '../../constants';
import { getFirestoreDocData } from '../../utils/firebase-utils';
import { microDateUserMovementsMyMoveSaga } from '../micro-date/micro-date-user-movements-saga';
import GeoUtils from '../../utils/geo-utils';
import DaterBackgroundGeolocation from '../../services/background-geolocation';

export default function* locationSaga() {
  try {
    yield put({ type: 'GEO_LOCATION_INITIALIZE' });
    const startActionChannel = yield actionChannel([
      'GEO_LOCATION_START_AUTO',
      'GEO_LOCATION_START_MANUALLY',
    ]);
    const isUserAuthenticated = yield select((state) => state.auth.isAuthenticated);

    if (!isUserAuthenticated) { // user must be authorized
      yield take('AUTH_SUCCESS');
    }
    const uid = yield select((state) => state.auth.uid);

    while (true) {
      const startAction = yield take(startActionChannel);
      const isAlreadyInitizlied = yield select((state) => state.location.isBackgroundGeolocationInitialized);
      if (!isAlreadyInitizlied) {
        yield DaterBackgroundGeolocation.init();
        yield put({ type: 'GEO_LOCATION_INITIALIZED' });
      }

      if (startAction.type === 'GEO_LOCATION_START_AUTO') {
        const myGeoPoint = yield getFirestoreDocData({
          collection: GEO_POINTS_COLLECTION,
          doc: uid,
        });

        if (myGeoPoint.visibility === 'private' || !myGeoPoint.visibility) {
          yield put({ type: 'GEO_LOCATION_TURNED_OFF_BY_USER' });
          continue; // eslint-disable-line
        }
      }

      const locationChannel = yield createLocationChannel();
      const task1 = yield takeEvery(locationChannel, updateLocation);
      const task2 = yield takeEvery(['AUTH_SUCCESS'], writeCoordsToFirestore);
      const task3 = yield takeLeading('GEO_LOCATION_UPDATED', locationUpdatedSaga);

      yield DaterBackgroundGeolocation.start();

      // start both tasks at the same time since GEO_LOCATION_UPDATED fires right away after changePace
      const [start, action] = yield all([ // eslint-disable-line
        DaterBackgroundGeolocation.changePace(true),
        take('GEO_LOCATION_UPDATED'), // wait for first update!
      ]);
      yield put({ type: 'GEO_LOCATION_STARTED', payload: action.payload });
      yield put({
        type: 'MAPVIEW_SHOW_MY_LOCATION',
        payload: {
          caller: 'locationSaga',
          zoom: 17,
        },
      });

      const task4 = yield takeEvery([
        'GEO_LOCATION_FORCE_UPDATE',
        'APP_STATE_ACTIVE',
      ], forceUpdate);

      yield take([
        'GEO_LOCATION_STOP',
        'AUTH_SIGNOUT_START',
      ]);
      yield DaterBackgroundGeolocation.stop();
      yield cancel(task1, task2, task3, task4);
      yield locationChannel.close();

      yield put({ type: 'GEO_LOCATION_STOPPED' });
    }
  } catch (error) {
    yield put({ type: 'GEO_LOCATION_MAINSAGA_ERROR', payload: error });
  }
}

function* locationUpdatedSaga(action) {
  const currentCoords = action.payload;
  const firstCoords = yield select((state) => state.location.firstCoords);

  if (!firstCoords || !currentCoords) return;

  const distanceFromFirstCoords = GeoUtils.distance(firstCoords, currentCoords);
  if (distanceFromFirstCoords > USERS_AROUND_SEARCH_RADIUS_KM * (1000 / 2)) {
    // restart users around if user travelled distance more than 1/2 of the searchable radius
    yield put({
      type: 'GEO_LOCATION_SET_FIRST_COORDS',
      payload: {
        latitude: currentCoords.latitude,
        longitude: currentCoords.longitude,
      },
    });
    yield put({ type: 'USERS_AROUND_RESTART', payload: distanceFromFirstCoords });
  }
}

function* updateLocation(coords) {
  if (coords && coords.latitude && coords.longitude) {
    yield put({
      type: 'GEO_LOCATION_UPDATED',
      payload: coords,
    });
    yield fork(microDateUserMovementsMyMoveSaga, coords);
    yield fork(writeCoordsToFirestore, coords);
  } else if (coords.error) {
    yield put({
      type: 'GEO_LOCATION_UPDATE_CHANNEL_ERROR',
      payload: coords.error,
    });
  } else {
    yield put({
      type: 'GEO_LOCATION_UPDATE_CHANNEL_UNKNOWN_ERROR',
    });
  }
}

function* writeCoordsToFirestore(coords) {
  try {
    const uid = yield select((state) => state.auth.uid);
    const moveHeadingAngle = yield select((state) => state.location.moveHeadingAngle);

    // do not record poor accuracy coords
    if (coords.accuracy > GOOD_GPS_ACCURACY_GENERAL) {
      return;
    }

    yield firebase.firestore()
      .collection(GEO_POINTS_COLLECTION)
      .doc(uid)
      .update({
        accuracy: coords.accuracy,
        heading: coords.heading > 0 ? coords.heading : moveHeadingAngle, // use calculated heading if GPS has no heading data
        speed: coords.speed,
        geoPoint: new firebase.firestore.GeoPoint(coords.latitude, coords.longitude),
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      });
  } catch (error) {
    yield put({ type: 'GEO_LOCATION_UPDATE_FIRESTORE_ERROR', payload: error });
  }
}

function* forceUpdate() {
  try {
    yield DaterBackgroundGeolocation.changePace(true);
  } catch (error) {
    yield put({ type: 'GEO_LOCATION_MAINSAGA_ERROR', payload: error });
  }
}

function createLocationChannel() {
  return eventChannel((emit) => {
    const onLocation = (location) => {
      const coords = location.location ? location.location.coords : location.coords; // handle location & heartbeat callback params
      emit({
        type: location.location ? 'heartbeat' : 'location',
        ...coords,
      });
    };

    const onError = (error) => {
      emit({
        error,
      });
    };

    BackgroundGeolocation.on('location', onLocation, onError);
    BackgroundGeolocation.on('heartbeat', onLocation, onError);

    // this will be invoked when the saga calls `channel.close` method
    const unsubscribe = () => {
      BackgroundGeolocation.un('location', onLocation);
      BackgroundGeolocation.un('heartbeat', onLocation);
    };
    return unsubscribe;
  });
}
