import React, { Component } from 'react';
import {
  StyleSheet,
  View,
  Platform,
  ScrollView,
} from 'react-native';
import DeviceInfo from 'react-native-device-info';

import DaterButton from '../../components/ui-kit/dater-button';
import CircleButton from '../../components/ui-kit/circle-button';

type Props = {
  navigation: any,
};

export default class DaterButtonsContainer extends Component<Props> {
  render() {
    return (
      <View style={styles.modalContainer}>
        <View style={styles.dismissButon}>
          <CircleButton type="close" onPress={() => this.props.navigation.goBack()} />
        </View>
        <ScrollView>
          <View style={styles.row}>
            <DaterButton type="main">
              button cta
            </DaterButton>
          </View>
          <View style={styles.row}>
            <DaterButton type="secondary">
              button sec
            </DaterButton>
          </View>
          <View style={styles.row}>
            <DaterButton type="text">
              text button
            </DaterButton>
          </View>
          <View style={styles.row}>
            <DaterButton type="main" xpReward={14}>
              награда xp
            </DaterButton>
          </View>
          <View style={styles.row}>
            <DaterButton type="secondary" xpReward={14}>
              reward xp
            </DaterButton>
          </View>
          <View style={styles.row}>
            <DaterButton type="main" coinReward={2}>
              Coin Reward
            </DaterButton>
          </View>
          <View style={styles.row}>
            <DaterButton type="secondary" coinReward={2}>
              Coin Reward
            </DaterButton>
          </View>
          <View style={styles.row}>
            <CircleButton type="close" />
            <CircleButton type="back" />
          </View>
        </ScrollView>
      </View>

    );
  }
}

const modalTopMargin = () => {
  if (Platform.OS === 'android') {
    return 8;
  } else if (DeviceInfo.getModel() === 'iPhone X') {
    return 40;
  } else if (Platform.OS === 'ios') {
    return 20;
  }
  return 8;
};

const modalBottomMargin = () => {
  if (DeviceInfo.getModel() === 'iPhone X') {
    return 20;
  }
  return 8;
};

const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    left: 20,
    top: 34,
  },
  dismissButon: {
    position: 'absolute',
    right: 0,
    left: 0,
    bottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  row: {
    flexDirection: 'row',
    paddingBottom: 16,
    justifyContent: 'center',
  },
  firstColumn: {
    width: 50,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 24,
    alignContent: 'center',
    alignSelf: 'center',
  },
  modalContainer: {
    padding: 16,
    margin: 8,
    marginTop: modalTopMargin(),
    marginBottom: modalBottomMargin(),
    flex: 1,
    justifyContent: 'center',
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    backgroundColor: '#ffffff',
    borderRadius: 4,
    shadowRadius: 16,
    shadowOpacity: 1,
    shadowOffset: {
      width: 0, height: 4,
    },
  },
});