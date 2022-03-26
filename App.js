import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";
import Constants from "expo-constants";
import JSSoup from "jssoup";

export default function App() {
  const [searching, setSearching] = useState(true); // searching routes
  const [routes, setRoutes] = useState([]);
  const getListSectionListWalk = (htmlText) => {
    const soup = new JSSoup(htmlText);
    const ol_element = soup.find("ol");
    const li_elements = ol_element.contents;
    const new_routes = [];
    li_elements.forEach((element) => {
      let route = {};
      route["data-x"] = element.attrs["data-x"];
      route["data-y"] = element.attrs["data-y"];

      const details = element.contents[0].contents;
      route["index"] = String(details[0].contents[0].string);

      if (details.length < 3) {
        // depart_point & arrive_point
        route["both_ends"] = true;
        route["text_point"] = String(details[1].string);
      } else {
        route["both_ends"] = false;
        route["text_section"] = String(details[1].string);
        route["direction_img"] = details[2].attrs.class;
        route["direction_txt"] = String(details[2].contents[0].string);
      }
      new_routes.push(route);
    });
    setRoutes(new_routes);
    setSearching(false);
  };
  const getHTMLString = (url) => {
    const request = new XMLHttpRequest();
    request.open("GET", url, true);
    request.onload = () => {
      getListSectionListWalk(request.responseText);
    };
    request.send();
  };
  return (searching ? (
    <WebView
      style={styles.container}
      // directly connect to target uri
      source={{
        uri: "https://m.map.kakao.com/actions/walkRoute?startLoc=%EC%84%9C%EC%9A%B8+%EC%84%B1%EB%B6%81%EA%B5%AC+%EC%95%88%EC%95%94%EB%8F%995%EA%B0%80+1-2&sxEnc=MOQPRPHVOOOPLNQOQ&syEnc=QNMSLQNIOPROMNPLLX&endLoc=%EC%95%88%EC%95%94%EC%97%AD+6%ED%98%B8%EC%84%A0&exEnc=MOPQQP&eyEnc=QNMPNMW&ids=%2CP21160853&service=#!/list",
      }}
      // source={{ uri: "https://map.kakao.com" }}
      onLoad={(syntheticEvent) => {
        const { nativeEvent } = syntheticEvent;
        if (nativeEvent.url.endsWith("list")) {
          getHTMLString(nativeEvent.url);
        }
      }}
    />
  ) : (
    <View style={styles.container}>
      {routes.map((element, index) => (
        <View key={index} style={styles.route}>
          {element["both_ends"] ? (
            <View style={styles.both_ends_true}>
              <Text>{element["index"]}</Text>
              <Text>{element["text_point"]}</Text>
            </View>
          ) : (
            <View style={styles.both_ends_false}>
              <Text>{element["direction_img"]}</Text>
              <Text>{element["direction_txt"]}</Text>
              <Text>{element["text_section"]}</Text>
            </View>
          )}
        </View>
      ))}
    </View>
  ));
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: Constants.statusBarHeight,
    backgroundColor: "grey",
  },
  route: {
    flex: 1,
  },
  both_ends_true: {
    backgroundColor: "yellow",
  },
  both_ends_false: {
    backgroundColor: "green",
  },
});
