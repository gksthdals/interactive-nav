import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Alert,
  Text,
  View,
  ScrollView,
  Dimensions,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import JSSoup from "jssoup";
import * as TaskManager from "expo-task-manager";
import * as Location from "expo-location";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const LOCATION_TASK_NAME = "LocationUpdate";
const REST_API_KEY = "2c5496592ddc68a5a57199f34a037b7a";
const CLOSED_DISTANCE = 1e-8;

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
  TaskManager.defineTask(
    LOCATION_TASK_NAME,
    ({ data: { locations }, error }) => {
      if (error) {
        // check `error.message` for more details.
        return;
      }
      const currentLoc = {
        latitude: parseFloat(locations[0]["coords"]["latitude"]) + 0.26,
        latitudeDelta: 0.010011167287203193,
        longitude: parseFloat(-locations[0]["coords"]["longitude"]) + 5,
        longitudeDelta: 0.008252863819677714,
      };
      // console.log("currentLoc:", currentLoc);
      // setLocation(currentLoc);
    }
  );
  // routes.keys: { "data-sx", "data-sy", "data-ex", "data-ey", "class", "txt_station",
  //                "bus_num", "txt_detail", "data-id", "data-buses", "subway_num" }
  const [routes, setRoutes] = useState(null);
  // current route index
  const [routeIndex, setRouteIndex] = useState(1);
  // current location
  const [location, setLocation] = useState({
    // Korea Univ.
    latitude: 37.58520547371376,
    latitudeDelta: 0.010000000000594866,
    longitude: 127.02547413870877,
    longitudeDelta: 0.008243657890659506,
  });
  const [nextLocation, setNextLocation] = useState(null);
  const [toNext, setToNext] = useState(true);
  const [prevBusLoc, setPrevBusLoc] = useState(null);
  const [toPrevBusLoc, setToPrevBusLoc] = useState(true);

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
    changeCoords(
      {
        "data-wx": busStopLocation.attrs["data-wx"],
        "data-wy": busStopLocation.attrs["data-wy"],
      },
      "prev"
    );
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
  const changeCoords = (WCONGNAMUL, type) => {
    const url = `https://dapi.kakao.com/v2/local/geo/transcoord.json?x=${WCONGNAMUL["data-wx"]}&y=${WCONGNAMUL["data-wy"]}&input_coord=WCONGNAMUL&output_coord=WGS84`;
    const request = new XMLHttpRequest();
    request.open("GET", url, true);
    request.setRequestHeader("Authorization", "KakaoAK " + REST_API_KEY);
    request.onload = () => {
      const document = JSON.parse(request.responseText).documents[0];
      const WGS84 = { latitude: document["y"], longitude: document["x"] };
      if (type === "next") {
        console.log(routeIndex + "번째 Route\nnextLocation :", WGS84);
        setNextLocation(WGS84);
      } else if (type === "prev") {
        console.log("prevBusStop :", WGS84);
        setPrevBusLoc(WGS84);
      }
    };
    request.send();
  };
  useEffect(() => {
    // request fore/background permissions
    requestPermissions();
    // request public routes & details
    const request = new XMLHttpRequest();
    request.open("GET", props.url, true);
    request.onload = () => {
      getListSectionListDetail(request.responseText);
    };
    request.send();
  }, []);
  useEffect(() => {
    if (routes === null) return;

    if (nextLocation === null) {
      changeCoords(
        {
          "data-wx": routes[routeIndex]["data-ex"],
          "data-wy": routes[routeIndex]["data-ey"],
        },
        "next"
      );
    }
    // if current route is public_bus depart -> get bus route and set prev bus stop location
    if (routes[routeIndex]["class"] === "public_bus depart") {
      const reply = Alert.alert(
        "Public bus depart",
        "Do you want to receive Alert at previous bus stop?"
      );
      getBusInfoHTML([routes[routeIndex], routes[routeIndex + 1]]);
    } else {
      setPrevBusLoc(null);
    }
  }, [routes, routeIndex]);
  useEffect(() => {
    if (nextLocation === null) return;

    // about routeIndex
    const distToNext =
      (location.latitude - nextLocation.latitude) ** 2 +
      (location.longitude - nextLocation.longitude) ** 2;

    if (toNext === true && distToNext < CLOSED_DISTANCE) {
      setToNext(false);
    } else if (toNext === false && distToNext > CLOSED_DISTANCE) {
      setRouteIndex(routeIndex+1);
      setToNext(true);
    }

    // alert at previous bus stop
    if (prevBusLoc === null) return;

    const distToPrev =
      (location.latitude - prevBusLoc.latitude) ** 2 +
      (location.longitude - prevBusLoc.longitude) ** 2;
    if (
      prevBusLoc !== null &&
      toPrevBusLoc === true &&
      distToPrev < CLOSED_DISTANCE
    ) {
      setToPrevBusLoc(false);
    } else if (
      prevBusLoc !== null &&
      toPrevBusLoc === false &&
      distToPrev > CLOSED_DISTANCE
    ) {
      Alert.alert("Getting off next bus stop!");
      setToPrevBusLoc(true);
    }
  }, [location]);
  return (
    <View style={{ flex: 1 }}>
      <View
        style={{
          flex: 3,
        }}
      >
        <MapView
          style={{ flex: 1 }}
          initialRegion={location}
          onRegionChange={(region) => {
            setLocation(region);
          }}
          // region={location}
        >
          <Marker
            coordinate={{
              latitude: location["latitude"],
              longitude: location["longitude"],
            }}
          />
        </MapView>
      </View>
      <View style={{ flex: 1, backgroundColor: "skyblue" }}>
        {routes === null ? (
          <View style={{ justifyContent: "center", alignItems: "center" }}>
            <ActivityIndicator />
          </View>
        ) : (
          <ScrollView
            pagingEnabled
            horizontal
            contentContainerStyle={styles.routes}
            contentOffset={{ x: SCREEN_WIDTH * routeIndex, y: 0 }}
          >
            {routes.map((route, index) => (
              <View key={index} style={styles.route}>
                <View
                  style={
                    index === routeIndex
                      ? { ...styles.route_details, backgroundColor: "yellow" }
                      : { ...styles.route_details, backgroundColor: "grey" }
                  }
                >
                  <Text>{route["class"]}</Text>
                  <Text>{route["txt_station"]}</Text>
                  {route["class"] === "public_bus depart" ? (
                    <View>
                      <Text>{route["bus_num"]}</Text>
                      <Text>{route["txt_detail"]}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            ))}
          </ScrollView>
        )}
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
    width: SCREEN_WIDTH * 0.9,
    height: "80%",
    marginVertical: "5%",
    marginHorizontal: "5%",
    borderRadius: 15,
    paddingVertical: "5%",
    paddingHorizontal: "5%",
  },
});
