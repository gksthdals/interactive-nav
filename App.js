import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { WebView } from "react-native-webview";
import Constants from "expo-constants";

export default function App() {
  const getHTMLString = (url) => {
    const request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.onload = () => {
      console.log(request.responseText);
    };
    request.send();
  };
  return (
    <WebView 
      style={styles.container}
      source={{ uri: "https://map.kakao.com" }}
      onLoad={(syntheticEvent) => {
        const { nativeEvent } = syntheticEvent;
        if (nativeEvent.url.endsWith("list")) {
          getHTMLString(nativeEvent.url);
        }
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: Constants.statusBarHeight,
  },
});
