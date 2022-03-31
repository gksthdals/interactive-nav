import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import JSSoup from "jssoup";
import * as TaskManager from "expo-task-manager";
import * as Location from "expo-location";

const LOCATION_TASK_NAME = "LocationUpdate";
const JAVASCRIPT_API_KEY = "YOUR KAKAO REST API KEY";

TaskManager.defineTask(LOCATION_TASK_NAME, ({ data: { locations }, error }) => {
  if (error) {
    // check `error.message` for more details.
    return;
  }
  console.log("Received new locations", locations);
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
  // [routes[index], routes[index+1]] : index -> bus depart / index+1 -> bus arrive
  const [busRoutes, setBusRoutes] = useState(null);
  // WCONGNAMUL: { "data-wx" , "data-wy" }
  const [WCONGNAMUL, setWCONGNAMUL] = useState(null);
  // WGS84: { "latitude" , "longitude" }
  const [WGS84, setWGS84] = useState(null);

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
    setWCONGNAMUL({
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
  const getJustBeforeBusStopUrl = (HTMLText) => {
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
  const getBusInfoHTML = () => {
    const busId = busRoutes[0]["data-buses"];
    const busStopId = busRoutes[0]["data-id"];
    const busInfoUrl = `https://m.map.kakao.com/actions/busDetailInfo?busId=${busId}&busStopId=${busStopId}`;
    const request = new XMLHttpRequest();
    request.open("GET", busInfoUrl, true);
    request.onload = () => {
      getJustBeforeBusStopUrl(request.responseText);
    };
    request.send();
  };
  const changeCoords = () => {
    const url = `https://dapi.kakao.com/v2/local/geo/transcoord.json?x=${WCONGNAMUL["data-wx"]}&y=${WCONGNAMUL["data-wy"]}&input_coord=WCONGNAMUL&output_coord=WGS84`;
    const request = new XMLHttpRequest();
    request.open("GET", url, true);
    request.setRequestHeader("Authorization", "KakaoAK " + JAVASCRIPT_API_KEY);
    request.onload = () => {
      const document = JSON.parse(request.responseText).documents[0];
      setWGS84({"latitude": document["y"], "longitude": document["x"]});
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
  useEffect(() => {
    if (busRoutes !== null) {
      getBusInfoHTML();
    }
  }, [busRoutes]);
  return (
    <ScrollView>
      {routes === null ? (
        <View style={{ justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator />
        </View>
      ) : (
        routes.map((route, index) => (
          <View key={index} style={styles.route}>
            <Text>{route["class"]}</Text>
            <Text>{route["txt_station"]}</Text>
            {route["class"] === "public_bus depart" ? (
              <View>
                <Text>{route["bus_num"]}</Text>
                <Text>{route["txt_detail"]}</Text>
                <TouchableOpacity
                  onPress={() => {
                    setBusRoutes([routes[index], routes[index + 1]]);
                  }}
                >
                  <Text>setBusRoutes</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    changeCoords(WCONGNAMUL["data-wx"], WCONGNAMUL["data-wy"]);
                  }}
                >
                  <Text>changeCoords</Text>
                </TouchableOpacity>
                <Text>{WGS84 === null ? "" : WGS84["latitude"]}</Text>
                <Text>{WGS84 === null ? "" : WGS84["longitude"]}</Text>
              </View>
            ) : null}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  route: {
    backgroundColor: "grey",
    marginVertical: "2.5%",
    marginHorizontal: "5%",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 5,
  },
});
