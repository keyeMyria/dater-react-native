import { combineReducers } from 'redux';

import * as authRedux from './authRedux';
import * as geoRedux from './geoRedux';
import * as usersAroundRedux from './usersAroundRedux';
import * as mapViewRedux from './mapViewRedux';
import compassReducer from './compass-redux';

export const reducer = combineReducers({
  auth: authRedux.reducer,
  geo: geoRedux.reducer,
  usersAround: usersAroundRedux.reducer,
  mapView: mapViewRedux.reducer,
  compass: compassReducer,
});

export const { authActionCreators } = authRedux;
export const { geoActionCreators } = geoRedux;
export const { usersAroundActionCreators } = usersAroundRedux;
export const { mapViewActionCreators } = mapViewRedux;
