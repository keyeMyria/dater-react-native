import React from 'react';
import {
  View,
  Image,
} from 'react-native';

import MapPanelStyles from './map-panel-styles';
import { H2, Caption2 } from '../../../components/ui-kit/atoms/typography';
import CircleButton from '../../../components/ui-kit/atoms/circle-button';
// import DaterButton from '../../../components/ui-kit/atoms/dater-button';
import cloudinaryUrl from '../../../utils/cloudinary-utils';

type Props = {
  aspectRatio: number,
  cloudinaryPublicId: string,
  cloudinaryImageVersion: number,
  targetUser: any,
  onDecline: () => void,
  onApprove: () => void,
}

class MapPanelSelfieUploadedByTarget extends React.Component<Props> {
  render() {
    return (
      <View>
        <H2 style={MapPanelStyles.panelHeader}>
          Сделано фото с тобой!
        </H2>
        <View>
          <View style={{
            marginBottom: 16,
            flexDirection: 'row',
          }}
          >
            <View
              style={{
                height: 112,
                aspectRatio: this.props.aspectRatio,
              }}
            >
              <Image
                style={{
                  height: 112,
                  alignSelf: 'flex-start',
                  aspectRatio: this.props.aspectRatio,
                  borderRadius: 4,
                }}
                source={{
                  uri: cloudinaryUrl({
                    publicId: `microDates/${this.props.cloudinaryPublicId}`,
                    version: this.props.cloudinaryImageVersion,
                  }, {
                    height: 112,
                    crop: 'scale',
                  }),
                }}
              />
            </View>
            <View style={{
              flex: 1,
              flexDirection: 'column',
              marginLeft: 16,
            }}
            >
              <Caption2
                style={MapPanelStyles.panelBody}
              >
                Ты подтверждаешь, что это фото сделано только что между тобой и {' '}
                {this.props.targetUser.name}? {'\n\n'}
                На фото должны быть видны ваши лица.
              </Caption2>
            </View>
          </View>
        </View>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-evenly',
          }}
        >
          <CircleButton type="decline" onPress={this.props.onDecline} size="medium-big" />
          <CircleButton type="confirm" onPress={this.props.onApprove} size="medium-big" />

          {/* <DaterButton
            style={[MapPanelStyles.panelButton, { width: 130 }]}
            onPress={this.props.onDecline}
          >
              Нет
          </DaterButton>
          <DaterButton
            style={[MapPanelStyles.panelButton, { width: 130 }]}
            onPress={this.props.onApprove}
          >
              Да
          </DaterButton> */}
        </View>
      </View>
    );
  }
}

export default MapPanelSelfieUploadedByTarget;
