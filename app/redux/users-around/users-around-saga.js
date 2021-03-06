import { put, select, take, takeEvery, cancel } from 'redux-saga/effects';
import firebase from 'react-native-firebase';
import { eventChannel } from 'redux-saga';
import * as _ from 'lodash';

import GeoUtils from '../../utils/geo-utils';

import {
  USERS_AROUND_SEARCH_RADIUS_KM,
  USERS_AROUND_SHOW_LAST_SEEN_HOURS_AGO,
  GEO_POINTS_COLLECTION,
  USERS_AROUND_PUBLIC_UPDATE_INTERVAL,
  USERS_AROUND_MICRODATE_UPDATE_INTERVAL,
  GEO_POINTS_PAST_MICRO_DATES_COLLECTION,
  USERS_AROUND_NEXT_MICRODATE_TIMEOUT_MS,
} from '../../constants';

const ONE_HOUR = 1000 * 60 * 60;

export default function* usersAroundSaga() {
  try {
    yield take('GEO_LOCATION_STARTED');
    const myUid = yield select((state) => state.auth.uid);
    let channel;
    let channelTask;

    while (true) {
      // only start when app state is active
      const appState = yield select((state) => state.appState.state);
      if (appState === 'background') {
        yield take('APP_STATE_ACTIVE');
      }
      let myCoords = yield select((state) => state.location.coords);

      // if there are no location coords, wait for the first coords
      if (!myCoords) {
        const newLocationAction = yield take('GEO_LOCATION_UPDATED');
        myCoords = newLocationAction.payload;
      }
      const isMicroDateMode = yield select((state) => state.microDate.enabled);

      if (isMicroDateMode) {
        const microDateState = yield select((state) => state.microDate);
        channel = yield createMicroDateChannel(myCoords, microDateState, myUid);
        channelTask = yield takeEvery(channel, updateMicroDate);
      } else {
        channel = yield createAllUsersAroundChannel(myCoords, myUid);
        channelTask = yield takeEvery(channel, updateUsersAround);
      }

      yield put({ type: 'USERS_AROUND_STARTED' });

      yield take([
        'USERS_AROUND_RESTART',
        'APP_STATE_BACKGROUND', // stop if app is in background
        'GEO_LOCATION_STOPPED', // stop if location services are disabled
        'MICRO_DATE_INCOMING_STARTED', // app mode switched to find user
        'MICRO_DATE_OUTGOING_STARTED',
        'MICRO_DATE_STOP',
        'MICRO_DATE_OUTGOING_FINISHED',
        'MICRO_DATE_INCOMING_FINISHED',
        'MICRO_DATE_INCOMING_REMOVE',
        'MICRO_DATE_OUTGOING_REMOVE',
        'MICRO_DATE_INCOMING_STOPPED_BY_ME',
        'MICRO_DATE_OUTGOING_STOPPED_BY_ME',
        'MICRO_DATE_OUTGOING_STOPPED_BY_TARGET',
        'MICRO_DATE_INCOMING_STOPPED_BY_TARGET',
      ]);

      yield cancel(channelTask);
      yield channel.close();
      yield put({ type: 'USERS_AROUND_STOPPED' });
    }
  } catch (error) {
    yield put({ type: 'USERS_AROUND_SAGA_ERROR', payload: error });
  }
}

function* updateUsersAround(usersAround) {
  if (usersAround.error) {
    yield put({
      type: 'USERS_AROUND_CHANNEL_ERROR',
      payload: usersAround.error,
    });
  } else {
    yield put({
      type: 'USERS_AROUND_UPDATED',
      payload: usersAround,
    });
  }
}

function* updateMicroDate(targetUser) {
  if (targetUser.error) {
    yield put({
      type: 'USERS_AROUND_MICRO_DATE_CHANNEL_ERROR',
      payload: targetUser.error,
    });
  } else {
    yield put({
      type: 'USERS_AROUND_MICRO_DATE_UPDATED',
      payload: [targetUser],
    });
    yield put({
      type: 'MICRO_DATE_TARGET_MOVE',
      payload: targetUser,
    });
  }
}

async function createAllUsersAroundChannel(userCoords, myUid) {
  let publicUsers = [];
  let privateUsers = [];
  let usersWithRecentMicroDates = [];

  const queryArea = {
    center: {
      latitude: userCoords.latitude,
      longitude: userCoords.longitude,
    },
    radius: USERS_AROUND_SEARCH_RADIUS_KM,
  };
  const box = GeoUtils.boundingBoxCoordinates(queryArea.center, queryArea.radius);
  const lesserGeopoint = new firebase.firestore
    .GeoPoint(box.swCorner.latitude, box.swCorner.longitude);
  const greaterGeopoint = new firebase.firestore
    .GeoPoint(box.neCorner.latitude, box.neCorner.longitude);

  const publicQuery = firebase.firestore()
    .collection(GEO_POINTS_COLLECTION)
    .where('geoPoint', '>', lesserGeopoint)
    .where('geoPoint', '<', greaterGeopoint)
    .where('visibility', '==', 'public');

  const privateQuery = firebase.firestore()
    .collection(GEO_POINTS_COLLECTION)
    .where('visibility', '==', myUid);

  const usersWithRecentMicroDatesQuery = firebase.firestore()
    .collection(GEO_POINTS_COLLECTION)
    .doc(myUid)
    .collection(GEO_POINTS_PAST_MICRO_DATES_COLLECTION)
    .where('timestamp', '>=', new Date(new Date() - USERS_AROUND_NEXT_MICRODATE_TIMEOUT_MS));

  return eventChannel((emit) => {
    const throttledEmit = _.throttle(emit, USERS_AROUND_PUBLIC_UPDATE_INTERVAL, { leading: true, trailing: true });

    const onPublicSnapshotUpdated = (snapShots) => {
      publicUsers = filterSnapshots(snapShots);
      emitUsersAround(throttledEmit);
    };

    const onPrivateSnapshotUpdated = (snapShots) => {
      privateUsers = filterSnapshots(snapShots);
      emitUsersAround(throttledEmit);
    };

    const onUsersWithRecentMicroDatesQueryUpdated = (snapshots) => {
      usersWithRecentMicroDates = [];

      snapshots.forEach((uidSnapshot) => {
        usersWithRecentMicroDates.push(uidSnapshot.id);
      });
      // console.log('usersWithRecentMicroDates: ', usersWithRecentMicroDates);
      emitUsersAround(throttledEmit);
    };

    const onError = (error) => {
      emit({
        error,
      });
    };

    const unsubscribeUsersWithRecentMicroDates = usersWithRecentMicroDatesQuery
      .onSnapshot(onUsersWithRecentMicroDatesQueryUpdated, onError);
    const unsubscribePublicUsers = publicQuery
      .onSnapshot(onPublicSnapshotUpdated, onError);
    const unsubscribePrivateUsers = privateQuery
      .onSnapshot(onPrivateSnapshotUpdated, onError);

    const unsubscribe = () => {
      unsubscribePublicUsers();
      unsubscribePrivateUsers();
      unsubscribeUsersWithRecentMicroDates();
    };
    return unsubscribe;
  });

  function filterSnapshots(snapShots) {
    const filteredResults = [];

    snapShots.forEach((userSnapshot) => {
      const userData = userSnapshot.data();
      userData.id = userSnapshot.id;

      if (userData.id === myUid) {
        return;
      } else if (Date.now() - new Date(userData.timestamp) > ONE_HOUR * USERS_AROUND_SHOW_LAST_SEEN_HOURS_AGO) {
        // only show users with fresh timestamps
        return;
      }

      userData.shortId = userSnapshot.id.substring(0, 4);
      filteredResults.push(userData);
    });
    return filteredResults;
  }

  function emitUsersAround(throttledEmit) {
    const combinedUsers = [...publicUsers, ...privateUsers];
    const withoutRecentMicroDates = combinedUsers.filter((user) => (
      !usersWithRecentMicroDates.includes(user.id)
    ));
    throttledEmit(_.uniqBy(withoutRecentMicroDates, (user) => user.id));
  }
}

function createMicroDateChannel(myCoords, microDateState, myUid) {
  const targetUid = microDateState.microDate.requestBy === myUid ?
    microDateState.microDate.requestFor : microDateState.microDate.requestBy;
  const query = firebase.firestore()
    .collection(GEO_POINTS_COLLECTION)
    .doc(targetUid);

  return eventChannel((emit) => {
    const onSnapshotUpdated = (snapshot) => {
      const targetUser = snapshot.data();
      if (!targetUser) return;

      targetUser.id = snapshot.id;
      targetUser.shortId = snapshot.id.substring(0, 4);

      emit(targetUser);
    };

    const throttledOnSnapshotUpdated = _.throttle(onSnapshotUpdated, USERS_AROUND_MICRODATE_UPDATE_INTERVAL);

    const onError = (error) => {
      emit({
        error,
      });
    };
    const unsubscribe = query.onSnapshot(throttledOnSnapshotUpdated, onError);

    return unsubscribe;
  });
}
