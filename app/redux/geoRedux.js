import firebase from 'react-native-firebase';
import { Dimensions } from 'react-native';

import { distance } from '../services/geoQuery';

const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const DEFAULT_LATITUDE_DELTA = 0.00322;
const DEFAULT_LONGITUDE_DELTA = DEFAULT_LATITUDE_DELTA * ASPECT_RATIO;

const types = {
  GEO_UPDATED: 'GEO_UPDATED',
  GEO_MAPVIEW_UPDATED: 'GEO_MAPVIEW_UPDATED',
  GEO_PERMISSION_REQUESTED: 'GEO_PERMISSION_REQUESTED',
  GEO_PERMISSION_GRANTED: 'GEO_PERMISSION_GRANTED',
  GEO_PERMISSION_DENIED: 'GEO_PERMISSION_DENIED',
};

const geoUpdated = (coords) => async (dispatch, getState) => {
  const { uid } = getState().auth;

  if (!coords) {
    return;
  }
  if (uid !== null) {
    await firebase.firestore().collection('geoPoints').doc(uid).update({
      accuracy: coords.accuracy,
      heading: coords.heading,
      speed: coords.speed,
      geoPoint: new firebase.firestore.GeoPoint(coords.latitude, coords.longitude),
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    })
      // .then(() => console.log('Successfully updated geo data'))
      .catch((error) => console.error(error));
  }

  dispatch({
    type: types.GEO_UPDATED,
    payload: coords,
  });
};

const geoRequest = () => ({
  type: types.GEO_PERMISSION_REQUESTED,
});

const geoGranted = (coords) => ({
  type: types.GEO_PERMISSION_GRANTED,
  payload: coords,
});

const geoDenied = (error) => ({
  type: types.GEO_PERMISSION_DENIED,
  payload: error,
});

const geoMapViewUpdated = (region) => {
  const center = {
    latitude: region.latitude,
    longitude: region.longitude,
  };
  const corner = {
    latitude: center.latitude + region.latitudeDelta,
    longitude: region.longitude + region.longitudeDelta,
  };
  const visibleRadiusInMeters = distance(center, corner);

  return {
    type: types.GEO_MAPVIEW_UPDATED,
    payload: {
      ...region,
      visibleRadiusInMeters,
    },
  };
};

export const geoActionCreators = {
  geoUpdated,
  geoRequest,
  geoGranted,
  geoDenied,
  geoMapViewUpdated,
};

const initialState = {
  coords: null,
  mapView: {
    latitudeDelta: DEFAULT_LATITUDE_DELTA,
    longitudeDelta: DEFAULT_LONGITUDE_DELTA,
    visibleRadiusInMeters: 410,
  },
  geoUpdates: 0,
  error: null,
  geoGranted: false,
};

export const reducer = (state = initialState, action) => {
  const { type, payload } = action;

  switch (type) {
    case types.GEO_UPDATED: {
      return {
        ...state,
        coords: payload,
        geoUpdates: state.geoUpdates + 1,
      };
    }
    case types.GEO_MAPVIEW_UPDATED: {
      return {
        ...state,
        mapView: payload,
      };
    }
    default: {
      return state;
    }
  }
};

