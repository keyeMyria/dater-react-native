import React from 'react';
import {
  StyleSheet,
  View,
  Platform,
  Dimensions,
} from 'react-native';

import { wrapCompassHeading } from '../../utils/geo-utils';
import { MICRO_DATE_MAPMAKER_POSITIVE_THRESHOLD_ANGLE } from '../../constants';

const SIZE: number = 17;
const HALO_RADIUS = 5;
const ARROW_SIZE = 7;
const ARROW_DISTANCE = 10;
const HALO_SIZE = SIZE + HALO_RADIUS;
const HEADING_BOX_SIZE = HALO_SIZE + ARROW_SIZE + ARROW_DISTANCE;
const colorOfmyLocationMapMarker = '#1F8BFF'; // '#2c7cf6';
const colorOfHalo = 'rgba(30,144,255,0.2)';
const { width, height } = Dimensions.get('window');
const DIAGONAL = Math.sqrt((width * width) + (height * height));

type Props = {
  accuracy: number,
  visibleRadiusInMeters: number,
  heading: number,
  mapViewHeadingAngle: number,
  mapViewModeIsSwitching: boolean,
  headingToTarget: number,
  microDateEnabled: boolean,
};

export default class MyLocationOnCenteredMap extends React.PureComponent<Props> {
  render() {
    const { accuracy } = this.props;
    const { visibleRadiusInMeters } = this.props;
    const pixelsPerMeter = DIAGONAL / (visibleRadiusInMeters * 2);
    const RADIUS = pixelsPerMeter * accuracy;
    // console.log(`Visible radius: ${visibleRadiusInMeters}, DIAGONAL: ${DIAGONAL}, pixelsPerMeter: ${pixelsPerMeter}, Radius: ${RADIUS}`);
    const rotation = (this.props.heading || 0) - (this.props.mapViewHeadingAngle || 0); // zeros protect from undefined values
    const rotate = `${rotation}deg`;
    const rotationTarget = (this.props.headingToTarget || 0) - (this.props.mapViewHeadingAngle || 0); // zeros protect from undefined values
    const rotateTarget = `${rotationTarget}deg`;
    const deltaMeAndTargetHeading =
      Math.abs(wrapCompassHeading(wrapCompassHeading(this.props.heading) -
               wrapCompassHeading(this.props.headingToTarget)));
    const microDateMarkerColor =
      deltaMeAndTargetHeading <= MICRO_DATE_MAPMAKER_POSITIVE_THRESHOLD_ANGLE ? '#3DB770' : '#EB5757';
    const markerColor = this.props.microDateEnabled ? microDateMarkerColor : colorOfmyLocationMapMarker;

    return (
      <View
        style={styles.locationContainer}
        pointerEvents="none"
      >
        <View style={{
          backgroundColor: colorOfHalo,
          width: RADIUS * 2,
          height: RADIUS * 2,
          borderRadius: Math.ceil(RADIUS),
          justifyContent: 'center',
          alignItems: 'center',
          position: 'absolute',
        }}
        />
        <View style={styles.container}>
          <View style={styles.markerHalo} />
          {!this.props.mapViewModeIsSwitching &&
            <View style={[styles.heading, { transform: [{ rotate }] }]}>
              <View style={styles.headingPointer} />
            </View>
          }
          {this.props.microDateEnabled &&
            <View style={[styles.heading, { transform: [{ rotate: rotateTarget }] }]}>
              <View style={[styles.headingPointer, {
                borderBottomColor: markerColor,
              }]}
              />
            </View>
          }
          <View style={[styles.marker, {
              backgroundColor: markerColor,
            }]}
          />
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  locationContainer: {
    marginTop: Platform.OS === 'ios' ? 10 : 0, // adjust status bar for iOS, need 10 for iPhone X
    position: 'absolute',
    right: 0,
    left: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  // The container is necessary to protect the markerHalo shadow from clipping
  container: {
    width: HEADING_BOX_SIZE,
    height: HEADING_BOX_SIZE,
  },
  markerHalo: {
    position: 'absolute',
    backgroundColor: 'white',
    top: 0,
    left: 0,
    width: HALO_SIZE,
    height: HALO_SIZE,
    borderRadius: Math.ceil(HALO_SIZE / 2),
    margin: (HEADING_BOX_SIZE - HALO_SIZE) / 2,
    shadowColor: 'black',
    shadowOpacity: 0.25,
    shadowRadius: 2,
    shadowOffset: {
      height: 0,
      width: 0,
    },
  },
  heading: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: HEADING_BOX_SIZE,
    height: HEADING_BOX_SIZE,
    alignItems: 'center',
  },
  headingPointer: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderTopWidth: 0,
    borderRightWidth: ARROW_SIZE * 0.75,
    borderBottomWidth: ARROW_SIZE,
    borderLeftWidth: ARROW_SIZE * 0.75,
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: colorOfmyLocationMapMarker,
    borderLeftColor: 'transparent',
  },

  marker: {
    justifyContent: 'center',
    backgroundColor: colorOfmyLocationMapMarker,
    width: SIZE,
    height: SIZE,
    borderRadius: Math.ceil(SIZE / 2),
    margin: (HEADING_BOX_SIZE - SIZE) / 2,
  },
});
