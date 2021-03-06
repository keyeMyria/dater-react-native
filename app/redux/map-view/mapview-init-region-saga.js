/**
 * Saga to initialize the mapview region on app load
 */
import { take, put, select, delay } from 'redux-saga/effects';

export default function* mapViewInitializeRegionSaga() {
  try {
    while (true) {
      yield take([
        'MAPVIEW_MAIN_SAGA_READY',
        'GEO_LOCATION_STOPPED',
      ]); // make sure the main saga is ready

      // only initialize mapView position when app is in active state
      const appStateIsBackground = yield select((state) => state.appState.state === 'background');
      if (appStateIsBackground) {
        yield take('APP_STATE_ACTIVE'); // do not process mapView tasks when app is in background!
      }

      const isUserAuthenticated = yield select((state) => state.auth.isAuthenticated);
      if (!isUserAuthenticated) { // user must be authorized
        yield take('AUTH_SUCCESS');
      }
      yield delay(1000);
      const coords = yield select((state) => state.location.coords);
      if (!coords) {
        yield put({
          type: 'MAPVIEW_SET_CAMERA',
          payload: {
            heading: 0,
            zoom: 1,
            latitude: 55.751244,
            longitude: 37.618423,
            duration: 2000,
          },
        });
      }
    }
  } catch (error) {
    yield put({ type: 'MAPVIEW_INIT_REGION_ERROR', payload: error });
  }
}
