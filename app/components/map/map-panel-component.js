import React, { Component } from 'react';
import {
  StyleSheet,
  View,
  Dimensions,
  Animated,
  Platform,
} from 'react-native';
import Interactable from 'react-native-interactable';
import 'moment/locale/ru';
import Moment from 'react-moment';
import { connect, Dispatch } from 'react-redux';

import { H2, Caption2 } from '../../components/ui-kit/typography';
import DaterButton from '../../components/ui-kit/dater-button';

const mapStateToProps = (state) => ({
  mapPanel: state.mapPanel,
  myCurrentCoords: state.location.coords,
  findUserUid: state.findUser.targetUserUid,
  findUserDistance: state.findUser.currentDistance,
});

const Screen = {
  width: Dimensions.get('window').width,
  height: Dimensions.get('window').height - 75,
};

type Props = {
  mapPanel: any,
  dispatch: Dispatch,
  findUserUid: string,
  findUserDistance: number,
};

class MapPanelComponent extends Component<Props> {
  _deltaY: Animated.Value;
  panViewBottom: Animated.Value;
  interactableElement: Interactable.View;
  showSnapPosition = Platform.OS === 'ios' ? Screen.height - 100 : Screen.height - 130;

  componentDidMount() {
    this.props.dispatch({
      type: 'UI_MAP_PANEL_READY',
      mapPanelSnapper: (args) => this.interactableElement.snapTo(args),
    });
  }

  componentWillUnmount() {
    this.props.dispatch({
      type: 'UI_MAP_PANEL_UNLOAD',
    });
  }

  onSnap = (event) => {
    if (event && event.nativeEvent &&
      (event.nativeEvent.id === 'close') && this.props.mapPanel.visible === true) {
      this.props.dispatch({ type: 'UI_MAP_PANEL_HIDE_FINISHED' });
    }
  }

  letsStart = () => {
    this.props.dispatch({
      type: 'UI_MAP_PANEL_HIDE',
      payload: {
        source: 'mapPanelComponentLetsStart',
      },
    });
    this.props.dispatch({ type: 'MAPVIEW_SHOW_ME_AND_TARGET_FIND_USER' });
  }

  requestDate = (user) => {
    this.props.dispatch({
      type: 'FIND_USER_REQUEST',
      payload: {
        user,
      },
    });
  }

  stopFindUser = () => {
    this.props.dispatch({ type: 'FIND_USER_STOP' });
    this.props.dispatch({
      type: 'UI_MAP_PANEL_HIDE',
      payload: {
        source: 'mapPanelComponentLetsStart',
      },
    });
  }

  acceptDateRequest = () => {
    this.props.dispatch({
      type: 'FIND_USER_ACCEPT_REQUEST',
    });
  }

  declineDateRequest = () => {
    this.props.dispatch({
      type: 'FIND_USER_DECLINE_REQUEST',
    });
    this.props.dispatch({
      type: 'UI_MAP_PANEL_HIDE_FORCE',
      payload: {
        source: 'declineDateRequest',
      },
    });
  }

  cancelDateRequest = () => {
    this.props.dispatch({
      type: 'FIND_USER_CANCEL_REQUEST',
    });
  }

  renderCard() {
    switch (this.props.mapPanel.mode) {
      case 'userCard':
        return (
          <View>
            <H2>Пользователь ({this.props.mapPanel.user.shortId} )</H2>
            <Caption2 style={{
              marginBottom: 8,
              marginTop: 8,
            }}
            >
              {Math.floor(this.props.mapPanel.user.distance)} метров от вас. {' '}
              Был <Moment locale="ru" element={Caption2} fromNow>{this.props.mapPanel.user.timestamp}</Moment>.
            </Caption2>
            <DaterButton style={styles.panelButton} onPress={() => this.requestDate(this.props.mapPanel.user)}>
              Встретиться
            </DaterButton>
          </View>
        );
      case 'findUser':
        return (
          <View>
            <H2>Найти {this.props.mapPanel.user.shortId}</H2>
            <Caption2 style={{
              marginBottom: 8,
              marginTop: 8,
            }}
            >
              Расстояние {Math.floor(this.props.mapPanel.user.distance)} м. {' '}
            </Caption2>
            <DaterButton
              style={styles.panelButton}
              onPress={this.letsStart}
            >
              Поехали!
            </DaterButton>
          </View>
        );
      case 'findUserActive':
        return (
          <View>
            <H2>Вы уже в поиске {this.props.findUserUid ? this.props.findUserUid.substring(0, 4) : ''}</H2>
            <Caption2 style={{
              marginBottom: 8,
              marginTop: 8,
            }}
            >
              Расстояние {Math.floor(this.props.findUserDistance)} м. {' '}
            </Caption2>
            <DaterButton
              style={styles.panelButton}
              onPress={this.stopFindUser}
            >
              Остановить
            </DaterButton>
          </View>
        );
      case 'newDateRequest':
        return (
          <View>
            <H2>Запрос от {this.props.mapPanel.user.shortId}</H2>
            <Caption2 style={{
              marginBottom: 8,
              marginTop: 8,
            }}
            >
              Расстояние {Math.floor(this.props.mapPanel.distance)} м. {' '}
              Date ID: {this.props.mapPanel.requestId.substring(0, 4)}
            </Caption2>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-evenly',
            }}
            >
              <DaterButton
                style={[styles.panelButton, { width: 150 }]}
                onPress={this.declineDateRequest}
              >
                Отклонить
              </DaterButton>
              <DaterButton
                style={[styles.panelButton, { width: 150 }]}
                onPress={this.acceptDateRequest}
              >
                Принять
              </DaterButton>
            </View>
          </View>
        );
      case 'newDateAwaitingAccept':
        return (
          <View>
            <H2>Ожидание ответа от {this.props.findUserUid ? this.props.findUserUid.substring(0, 4) : ''}</H2>
            <Caption2 style={{
              marginBottom: 8,
              marginTop: 8,
            }}
            >
              Запрос отправлен 5 минут назад
            </Caption2>
            <DaterButton
              style={styles.panelButton}
              onPress={this.cancelDateRequest}
            >
              Отменить
            </DaterButton>
          </View>
        );
      default:
        return null;
    }
  }

  render() {
    return (
      <View
        style={styles.panelContainer}
        pointerEvents="box-none"
      >
        <Interactable.View
          ref={(component) => { this.interactableElement = component; }}
          verticalOnly
          snapPoints={[
              { y: this.showSnapPosition, id: 'show' },
              { y: this.showSnapPosition - 60, id: 'show_findUserActive' },
              { y: Screen.height + 80, id: 'close' }, // close map panel snap point
            ]}
          boundaries={{ top: -300 }}
          initialPosition={{ y: Screen.height + 80 }}
          animatedValueY={this._deltaY}
          onSnap={this.onSnap}
        >
          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <View style={styles.panelHandle} />
            </View>
            {this.renderCard()}
          </View>
        </Interactable.View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  panelContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
    zIndex: 4,
  },
  panel: {
    height: Screen.height + 300,
    padding: 20,
    backgroundColor: '#FAFAFA',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderRadius: 4,
    shadowColor: 'rgba(0, 0, 0, 0.2)',
    shadowRadius: 4,
    shadowOpacity: 1,
    shadowOffset: {
      width: 0, height: 0,
    },
    elevation: 1,
  },
  panelHeader: {
    alignItems: 'center',
  },
  panelHandle: {
    width: 48,
    height: 4,
    borderRadius: 4,
    backgroundColor: '#00000040',
    marginBottom: 10,
  },
  panelButton: {
    alignItems: 'center',
    marginVertical: 8,
    alignSelf: 'center',
  },
  photo: {
    width: Screen.width - 40,
    height: 225,
    marginTop: 30,
  },
});

export default connect(mapStateToProps)(MapPanelComponent);
