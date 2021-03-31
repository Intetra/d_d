import { StatusBar } from "expo-status-bar";
import React from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  PanResponder,
  Animated,
} from "react-native";

function getRandomColor() {
  var letters = "0123456789ABCDEF";
  var color = "#";
  for (var i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

function immutableMove(arr, from, to) {
  return arr.reduce((prev, current, idx, self) => {
    if (from === to) {
      prev.push(current);
    }
    if (idx === from) {
      return prev;
    }
    if (from < to) {
      prev.push(current);
    }
    if (idx === to) {
      prev.push(self[from]);
    }
    if (from > to) {
      prev.push(current);
    }
    return prev;
  }, []);
}

const colorMap = {};

export default class App extends React.Component {
  _panResponder;
  point = new Animated.ValueXY();
  currentY = 0;
  scrollOffset = 0;
  flatlistTopOffset = 0;
  rowHeight = 0;
  currentIndex = -1;
  active = false;

  constructor(props) {
    super(props);

    this._panResponder = PanResponder.create({
      // Ask to be the responder:
      onStartShouldSetPanResponder: (evt, gestureState) => true,
      onStartShouldSetPanResponderCapture: (evt, gestureState) => true,
      onMoveShouldSetPanResponder: (evt, gestureState) => true,
      onMoveShouldSetPanResponderCapture: (evt, gestureState) => true,

      onPanResponderGrant: (evt, gestureState) => {
        this.currentIndex = this.yToIndex(gestureState.y0);
        this.currentY = gestureState.y0;
        Animated.event([{ y: this.point.y }], { useNativeDriver: false })({
          y: gestureState.y0 - this.rowHeight / 2,
        });
        this.active = true;
        this.setState(
          { dragging: true, draggingIndex: this.currentIndex },
          () => {
            this.animateList();
          }
        );
        // The gesture has started. Show visual feedback so the user knows
        // what is happening!
        // gestureState.d{x,y} will be set to zero now
      },
      onPanResponderMove: (evt, gestureState) => {
        this.currentY = gestureState.moveY;
        Animated.event([{ y: this.point.y }], { useNativeDriver: false })({
          y: gestureState.moveY - this.rowHeight / 2,
        });
        // The most recent move distance is gestureState.move{X,Y}
        // The accumulated gesture distance since becoming responder is
        // gestureState.d{x,y}
      },
      onPanResponderTerminationRequest: (evt, gestureState) => false,
      onPanResponderRelease: (evt, gestureState) => {
        this.reset()
        // The user has released all touches while this view is the
        // responder. This typically means a gesture has succeeded
      },
      onPanResponderTerminate: (evt, gestureState) => {
        // Another component has become the responder, so this gesture
        // should be cancelled
        this.reset()
      },
      onShouldBlockNativeResponder: (evt, gestureState) => {
        // Returns whether this component should block native components from becoming the JS
        // responder. Returns true by default. Is currently only supported on android.
        return true;
      },
    });
  }

  reset = () => {
    this.active = false;
    this.setState({ dragging: false, draggingIndex: -1 });
  }

  animateList = () => {
    if (!this.active) {
      return;
    }
    requestAnimationFrame(() => {
      //check y value see if we need to reorder
      const newIndex = this.yToIndex(this.currentY);
      if (this.currentIndex !== newIndex) {
        this.setState({
          data: immutableMove(this.state.data, this.currentIndex, newIndex),
          draggingIndex: newIndex
        });
        this.currentIndex = newIndex;
      }

      this.animateList();
    });
  };

  yToIndex = (y) => {
    const value = Math.floor(
      (this.scrollOffset + y - this.flatlistTopOffset) / this.rowHeight
    );

    if (value < 0) {
      return 0;
    } else if (value > this.state.data.length) {
      return this.state.data.length - 1;
    } else {
      return value;
    }
  };

  state = {
    dragging: false,
    draggingIndex: -1,
    data: Array.from(Array(200), (_, index) => {
      colorMap[index] = getRandomColor();
      return index;
    }),
  };

  render() {
    const { data, dragging, draggingIndex } = this.state;

    const renderItem = ({ item, index }, noPanResponder = false) => (
      <View
        onLayout={(e) => {
          this.rowHeight = e.nativeEvent.layout.height;
        }}
        style={{
          padding: 16,
          backgroundColor: colorMap[item],
          flexDirection: "row",
          opacity: draggingIndex === index ? 0 : 1,
        }}
      >
        <View {...(noPanResponder ? {} : this._panResponder.panHandlers)}>
          <Text style={{ fontSize: 28 }}>@</Text>
        </View>
        <Text
          style={{
            fontSize: 22,
            textAlign: "center",
            flex: 1,
          }}
        >
          {item}
        </Text>
      </View>
    );

    return (
      <View style={styles.container}>
        {dragging && (
          <Animated.View
            style={{
              position: "absolute",
              backgroundColor: "black",
              zIndex: 2,
              width: "100%",
              top: this.point.getLayout().top,
            }}
          >
            {renderItem({ item: data[draggingIndex], index: -1 }, true)}
          </Animated.View>
        )}
        <FlatList
          scrollEnabled={!dragging}
          style={{ width: "100%" }}
          data={data}
          renderItem={(item) => renderItem(item)}
          onScroll={(e) => {
            this.scrollOffset = e.nativeEvent.contentOffset.y;
          }}
          onLayout={(e) => {
            this.flatlistTopOffset = e.nativeEvent.layout.y;
          }}
          scrollEventThrottle={16}
          keyExtractor={(item) => item.toString()}
        />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 20,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
});
