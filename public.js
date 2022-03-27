import React, { useState, useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import JSSoup from "jssoup";
import { Feather, MaterialIcons, Entypo, Fontisto } from "@expo/vector-icons";

export default function Public(props) {
  // routes.keys:
  const [routes, setRoutes] = useState([]);
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
          a_elements[0].contents[0].contents[2].contents[1].contents[0].descendants[2]
        );
        route["txt_detail"] = String(
          a_elements[0].contents[0].contents[3].string
        );
        route["data-id"] = a_elements[1].attrs["data-id"];
        route["data-buses"] = a_elements[1].attrs["data-buses"];
        route["data-indices"] = a_elements[1].attrs["data-indices"];
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
  useEffect(() => {
    const request = new XMLHttpRequest();
    request.open("GET", props.url, true);
    request.onload = () => {
      getListSectionListDetail(request.responseText);
    };
    request.send();
  }, []);
  return !routes ? (
    <View style={{ justifyContent: "center", alignItems: "center" }}>
      <Text>Loading...</Text>
    </View>
  ) : (
    <View style={styles.container}>
      <Text style={{ justifyContent: "center", alignItems: "center" }}>
        Hello!
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
