import { call, take, put, takeEvery, select, cancel } from 'redux-saga/effects';
import { eventChannel } from 'redux-saga';
import firebase from 'react-native-firebase';

import GeoUtils from '../utils/geo-utils';

import { MICRO_DATES_COLLECTION } from '../constants';

export default function* findUserSaga() {
  try {
    const isUserAuthenticated = yield select((state) => state.auth.isAuthenticated);
    if (!isUserAuthenticated) { // user must be authorized
      yield take('AUTH_SUCCESS');
    }
    const isGeolocationEnabled = yield select((state) => state.location.enabled);
    if (!isGeolocationEnabled) {
      yield take('GEO_LOCATION_STARTED'); // geo location must be enabled
    }

    const myUid = yield select((state) => state.auth.uid);
    const hasActiveDates = yield hasActiveDate(myUid);
    console.log('hasActiveDates: ', hasActiveDates);
    const dateRequestsChannel = yield call(createChannelToMonitorDateRequests, myUid);
    yield takeEvery(dateRequestsChannel, handleDateRequests);

    while (true) {
      const action = yield take('FIND_USER_REQUEST');
      const targetUser = action.payload.user;

      const requestId = yield firebase.firestore().collection(MICRO_DATES_COLLECTION).add({
        status: 'REQUEST',
        requestBy: myUid,
        requestFor: targetUser.uid,
        requestByRef: firebase.firestore().collection('geoPoints').doc(myUid),
        requestForRef: firebase.firestore().collection('geoPoints').doc(targetUser.uid),
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        active: true,
      });

      const microDateChannel = yield call(createChannelToMicroDate, requestId.id);
      const task1 = yield takeEvery(microDateChannel, microDateUpdatedSaga);

      yield put({
        type: 'FIND_USER_REQUESTED',
        payload: {
          user: targetUser,
        },
      });
      yield take('FIND_USER_STOP');
      yield cancel(task1);
      yield microDateChannel.close();
      yield put({ type: 'FIND_USER_STOPPED' });
    }
  } catch (error) {
    yield put({ type: 'FIND_USER_ERROR', payload: error });
  }
}

function* microDateUpdatedSaga(microDateData) {
  yield put({
    type: 'FIND_USER_UPDATED',
    payload: microDateData,
  });
}

function createChannelToMicroDate(microDateId) {
  const query = firebase.firestore().collection(MICRO_DATES_COLLECTION).doc(microDateId);
  return eventChannel((emit) => {
    const onSnapshotUpdated = (dataSnapshot) => {
      emit(dataSnapshot.data());
    };
    const onError = (error) => {
      emit({
        error,
      });
    };

    const unsubscribe = query.onSnapshot(onSnapshotUpdated, onError);

    return unsubscribe;
  });
}

function* handleDateRequests(dateRequest) {
  if (dateRequest.status === 'REQUEST') {
    const myCoords = yield select((state) => state.location.coords);
    yield put({ type: 'FIND_USER_INCOMING_REQUEST', payload: dateRequest });
    const userSnap = yield dateRequest.requestByRef.get();
    const user = {
      id: userSnap.id,
      shortId: userSnap.id.substring(0, 4),
      ...userSnap.data(),
    };
    yield put({
      type: 'UI_MAP_PANEL_SHOW',
      payload: {
        mode: 'newDateRequest',
        user,
        distance: GeoUtils.distance(userSnap.data().geoPoint, myCoords),
        canHide: false,
        requestId: dateRequest.id,
      },
    });
    const nextAction = yield take([
      'FIND_USER_DECLINE_REQUEST',
      'FIND_USER_ACCEPT_REQUEST',
    ]);

    if (nextAction.type === 'FIND_USER_DECLINE_REQUEST') {
      yield firebase.firestore().collection(MICRO_DATES_COLLECTION).doc(dateRequest.id).update({
        status: 'DECLINE',
        active: false,
      });
    }
  }
}

function createChannelToMonitorDateRequests(uid) {
  const dateStartedByOthersQuery = firebase.firestore().collection(MICRO_DATES_COLLECTION)
    .where('requestFor', '==', uid)
    .where('active', '==', true);

  return eventChannel((emit) => {
    const onSnapshotUpdated = (snapshot) => {
      if (snapshot.docs.length > 0) {
        const dateRequest = snapshot.docs[0].data();
        emit({
          ...dateRequest,
          id: snapshot.docs[0].id,
        });
      }
    };
    const onError = (error) => {
      emit({
        error,
      });
    };

    const unsubscribe = dateStartedByOthersQuery.onSnapshot(onSnapshotUpdated, onError);

    return unsubscribe;
  });
}

async function hasActiveDate(uid) {
  const dateStartedByMeQuery = firebase.firestore().collection(MICRO_DATES_COLLECTION)
    .where('requestBy', '==', uid)
    .where('active', '==', true);
  const dateStartedByMeSnapshot = await dateStartedByMeQuery.get();
  const dateStartedByOthersQuery = firebase.firestore().collection(MICRO_DATES_COLLECTION)
    .where('requestFor', '==', uid)
    .where('active', '==', true);
  const dateStartedByOthersSnapshot = await dateStartedByOthersQuery.get();
  console.log('Active dates by me: ', dateStartedByMeSnapshot.docs.length);
  console.log('Active dates by others: ', dateStartedByOthersSnapshot.docs.length);
  return dateStartedByMeSnapshot.docs.length > 0 || dateStartedByOthersSnapshot.docs.length > 0;
}
