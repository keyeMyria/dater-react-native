import React, { Component } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { connect } from 'react-redux'
import firebase from 'react-native-firebase';

import { DaterMapView, FirebaseSetup } from "../components";
import { initUserAuth } from "../services/auth";
import { authActionCreators } from '../redux'

const mapStateToProps = (state) => ({
  auth: state.auth
})

type Props = {};
class Main extends Component<Props> {
  constructor(props) {
    super(props);
    this.authUnsubscribe = initUserAuth(this.props.dispatch);
  }

  componentWillMount() {
    // signInAnonymously()
    //   .then(response => this.props.dispatch(authActionCreators.authSuccess(response)))
    //   .catch(error => this.props.dispatch(authActionCreators.authError(error)));
  }

  componentWillUnmount() {
    this.authUnsubscribe();
  }

  render() {
    return (
      <View style={styles.mainContainer}>
        {/* <FirebaseSetup /> */}
        <DaterMapView />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  mainContainer: {
    backgroundColor: 'gray',
    opacity: 1,
    alignSelf: 'stretch',
    flex: 1,
  },
});

export default connect(mapStateToProps)(Main)