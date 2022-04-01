import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  ScrollView,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import JSSoup from "jssoup";
import * as TaskManager from "expo-task-manager";
import * as Location from "expo-location";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const LOCATION_TASK_NAME = "LocationUpdate";
const JAVASCRIPT_API_KEY = "2dfe44f17b39fc1ca24032eb27dd48ce";

// Location Variables
let currentLocation = null;
let prevBusLocation = null;

TaskManager.defineTask(LOCATION_TASK_NAME, ({ data: { locations }, error }) => {
  if (error) {
    // check `error.message` for more details.
    return;
  }
  console.log("Received new locations", locations);
  currentLocation = locations[0];
});

async function requestPermissions() {
  const foregroundPromise = await Location.requestForegroundPermissionsAsync();
  const backgroundPromise = await Location.requestBackgroundPermissionsAsync();

  if (
    foregroundPromise.status === "granted" &&
    backgroundPromise.status === "granted"
  ) {
    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.Balanced,
    });
  }
}

export default function Public(props) {
  // routes.keys: { "data-sx", "data-sy", "data-ex", "data-ey", "class", "txt_station",
  //                "bus_num", "txt_detail", "data-id", "data-buses", "subway_num" }
  const [routes, setRoutes] = useState(null);

  const getListSectionListDetail = (htmlText) => {
    const soup = new JSSoup(htmlText);
    const ol_element = soup.find("ol");
    const li_elements = ol_element.contents;
    const new_routes = [];
    li_elements.forEach((element) => {
      let route = {};

      route["data-sx"] =
        "data-sx" in element.attrs ? element.attrs["data-sx"] : "";
      route["data-sy"] =
        "data-sy" in element.attrs ? element.attrs["data-sy"] : "";
      route["data-ex"] =
        "data-ex" in element.attrs ? element.attrs["data-ex"] : "";
      route["data-ey"] =
        "data-ey" in element.attrs ? element.attrs["data-ey"] : "";

      const a_elements = element.contents;
      if (a_elements[0].contents[0].attrs["class"].includes("detail_start")) {
        route["class"] = "depart";
        route["txt_station"] = String(
          a_elements[0].contents[0].contents[2].string
        );
      } else if (
        a_elements[0].contents[0].attrs["class"].includes("public_walk")
      ) {
        route["class"] = "public_walk";
        route["txt_station"] = String(
          a_elements[0].contents[0].contents[1].string
        );
      } else if (
        a_elements[0].contents[0].attrs["class"].includes("public_bus") &&
        route["data-sx"] !== ""
      ) {
        route["class"] = "public_bus depart";
        route["txt_station"] = String(
          a_elements[0].contents[0].contents[1].string
        );
        route["bus_num"] = String(
          a_elements[0].contents[0].contents[2].contents[1].contents[0]
            .descendants[2]
        );
        route["txt_detail"] = String(
          a_elements[0].contents[0].contents[3].string
        );
        route["data-id"] = a_elements[1].attrs["data-id"];
        route["data-buses"] = a_elements[1].attrs["data-buses"];
      } else if (
        a_elements[0].contents[0].attrs["class"].includes("public_bus") &&
        route["data-sx"] === ""
      ) {
        route["class"] = "public_bus arrive";
        route["txt_station"] = String(
          a_elements[0].contents[0].contents[1].string
        );
      } else if (
        a_elements[0].contents[0].attrs["class"].includes("public_subway") &&
        route["data-sx"] !== ""
      ) {
        route["class"] = "public_subway depart";
        route["txt_station"] = String(
          a_elements[0].contents[0].contents[1].string
        );
        route["subway_num"] = String(
          a_elements[0].contents[0].contents[0].descendants[0]
        );
        route["txt_detail"] = String(
          a_elements[0].contents[0].contents[3].string
        );
      } else if (
        a_elements[0].contents[0].attrs["class"].includes("public_subway") &&
        route["data-sx"] === ""
      ) {
        route["class"] = "public_subway arrive";
        route["txt_station"] = String(
          a_elements[0].contents[0].contents[1].string
        );
      } else {
        route["class"] = "destination arrive";
        route["txt_station"] =
          String(a_elements[0].contents[1].string) + "도착!";
      }
      new_routes.push(route);
    });
    setRoutes(new_routes);
  };
  const getJustBeforeBusStopLocation = (HTMLText) => {
    const justBeforeBusStopSoup = new JSSoup(HTMLText);
    const articleElement = justBeforeBusStopSoup.find("article");
    const busStopLocation =
      articleElement.contents[3].contents[1].contents[1].contents[1];
    changeCoords({
      "data-wx": busStopLocation.attrs["data-wx"],
      "data-wy": busStopLocation.attrs["data-wy"],
    });
  };
  const getJustBeforeBusStopHTML = (href) => {
    const justBeforeBusStopUrl = `https://m.map.kakao.com${href}`;
    const request = new XMLHttpRequest();
    request.open("GET", justBeforeBusStopUrl, true);
    request.onload = () => {
      getJustBeforeBusStopLocation(request.responseText);
    };
    request.send();
  };
  const getJustBeforeBusStopUrl = (busRoutes, HTMLText) => {
    const sIndex = busRoutes[0]["txt_detail"].indexOf(" ");
    const eIndex = busRoutes[0]["txt_detail"].indexOf("개");
    const steps = parseInt(
      busRoutes[0]["txt_detail"].substring(sIndex + 1, eIndex)
    );
    const departBusStopName = busRoutes[0]["txt_station"].substring(
      0,
      busRoutes[0]["txt_station"].indexOf("(")
    );
    const ArriveBusStopName = busRoutes[1]["txt_station"].substring(
      0,
      busRoutes[1]["txt_station"].indexOf("(")
    );
    const busInfoSoup = new JSSoup(HTMLText);
    let listRouteElements = null;
    busInfoSoup.findAll("ul").forEach((element) => {
      if (element.attrs["class"] === "list_route") {
        listRouteElements = element;
      }
    });
    const li_elements = listRouteElements.contents;
    for (let i = 0; i < li_elements.length; i++) {
      if (
        li_elements[i].attrs["data-name"] === departBusStopName &&
        li_elements[i + steps].attrs["data-name"] === ArriveBusStopName
      ) {
        getJustBeforeBusStopHTML(
          li_elements[i + steps - 1].contents[1].attrs["href"]
        );
        break;
      }
    }
  };
  const getBusInfoHTML = (busRoutes) => {
    const busId = busRoutes[0]["data-buses"];
    const busStopId = busRoutes[0]["data-id"];
    const busInfoUrl = `https://m.map.kakao.com/actions/busDetailInfo?busId=${busId}&busStopId=${busStopId}`;
    const request = new XMLHttpRequest();
    request.open("GET", busInfoUrl, true);
    request.onload = () => {
      getJustBeforeBusStopUrl(busRoutes, request.responseText);
    };
    request.send();
  };
  const changeCoords = (WCONGNAMUL) => {
    const url = `https://dapi.kakao.com/v2/local/geo/transcoord.json?x=${WCONGNAMUL["data-wx"]}&y=${WCONGNAMUL["data-wy"]}&input_coord=WCONGNAMUL&output_coord=WGS84`;
    const request = new XMLHttpRequest();
    request.open("GET", url, true);
    request.setRequestHeader("Authorization", "KakaoAK " + JAVASCRIPT_API_KEY);
    request.onload = () => {
      const document = JSON.parse(request.responseText).documents[0];
      prevBusLocation = { latitude: document["y"], longitude: document["x"] };
      console.log(prevBusLocation);
    };
    request.send();
  };
  useEffect(() => {
    const request = new XMLHttpRequest();
    request.open("GET", props.url, true);
    request.onload = () => {
      getListSectionListDetail(request.responseText);
    };
    request.send();
  }, []);
  return (
    <View style={{ flex: 1 }}>
      <View
        style={{
          flex: 3,
          backgroundColor: "yellow",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text style={{ fontSize: 50 }}>Map</Text>
      </View>
      <View style={{ flex: 1, backgroundColor: "skyblue" }}>
        <ScrollView
          pagingEnabled
          horizontal
          contentContainerStyle={styles.routes}
        >
          {routes === null ? (
            <View style={{ justifyContent: "center", alignItems: "center" }}>
              <ActivityIndicator />
            </View>
          ) : (
            routes.map((route, index) => (
              <View key={index} style={styles.route}>
                <View style={styles.route_details}>
                  <Text>{route["class"]}</Text>
                  <Text>{route["txt_station"]}</Text>
                  {route["class"] === "public_bus depart" ? (
                    <View>
                      <Text>{route["bus_num"]}</Text>
                      <Text>{route["txt_detail"]}</Text>
                      <TouchableOpacity
                        onPress={() => {
                          getBusInfoHTML([routes[index], routes[index + 1]]);
                        }}
                      >
                        <Text>setBusRoutes</Text>
                      </TouchableOpacity>
                      <Text>
                        {prevBusLocation === null
                          ? ""
                          : prevBusLocation["latitude"]}
                      </Text>
                      <Text>
                        {prevBusLocation === null
                          ? ""
                          : prevBusLocation["longitude"]}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  routes: {},
  route: {
    width: SCREEN_WIDTH,
    alignItems: "flex-start",
  },
  route_details: {
    backgroundColor: "grey",
    width: SCREEN_WIDTH * 0.9,
    height: "80%",
    marginVertical: "5%",
    marginHorizontal: "5%",
    borderRadius: 15,
    paddingVertical: "5%",
    paddingHorizontal: "5%",
  },
});
