import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";
import Constants from "expo-constants";
import Public from "./public";
import Walk from "./walk";

export default function App() {
  const [url, setUrl] = useState("");
  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="auto" />
      <View style={styles.container}>
        {url === "" ? (
          <WebView
            // source={{ uri: "https://map.kakao.com" }}
            source={{
              uri: "https://m.map.kakao.com/actions/publicDetailRoute?mode=list&service=&startLoc=서울+성북구+안암동5가+1-2&sxEnc=MOQPSMHQMOPRLNQNM&syEnc=QNMSLQQIRSRPSQOLP&endLoc=현대프라임아파트&exEnc=MMOPSM&eyEnc=QNLLRQV&ranking=2&ids=,P11198376",
            }}
            onLoad={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              if (
                nativeEvent.url.includes("publicDetailRoute") ||
                nativeEvent.url.includes("walkRoute")
              ) {
                setUrl(nativeEvent.url);
              }
            }}
          />
        ) : (
          (() => {
            switch (url.charAt(32)) {
              case "p":
                return <Public style={{ flex: 1 }} url={url} />;
              case "w":
                return <Walk style={{ flex: 1 }} url={url} />;
              default:
                return (
                  <Text
                    style={{
                      flex: 1,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    {url}
                  </Text>
                );
            }
          })()
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: Constants.statusBarHeight,
  },
});
