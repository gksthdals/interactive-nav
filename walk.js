import React, { useState, useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import JSSoup from "jssoup";
import { Feather, MaterialIcons, Entypo, Fontisto } from "@expo/vector-icons";

const ico_path = {
  "distance_desc straight_walk": { type: "Feather", name: "arrow-up" },
  "distance_desc left_walk": { type: "Feather", name: "corner-up-left" },
  "distance_desc right_walk": { type: "Feather", name: "corner-up-right" },
  "distance_desc walk_ico subway_walk ": {
    type: "MaterialIcons",
    name: "directions-subway",
  },
  "distance_desc walk_ico crosswalk_walk ": {
    type: "MaterialIcons",
    name: "directions-walk",
  },
};

export default function Walk(props) {
  // routes.keys: [data-x, data-y, index, both_ends, text_point / text_section&direction_img&direction_txt]
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
  };
  useEffect(() => {
    const request = new XMLHttpRequest();
    request.open("GET", props.url, true);
    request.onload = () => {
      getListSectionListWalk(request.responseText);
    };
    request.send();
  }, []);
  return !routes ? (
    <View style={{ justifyContent: "center", alignItems: "center" }}>
      <Text>Loading...</Text>
    </View>
  ) : (
    <View style={styles.container}>
      {routes.map((element, index) => (
        <View key={index} style={styles.route}>
          {element["both_ends"] ? (
            <View style={styles.both_ends_true}>
              <View style={styles.details_ico}>
                {element["index"] === "출발" ? (
                  <Entypo name="direction" size={50} color="black" />
                ) : (
                  <Fontisto name="slightly-smile" size={50} color="black" />
                )}
              </View>
              <View style={styles.details_txt}>
                <Text style={{ fontWeight: "700" }}>
                  {element["text_point"]}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.both_ends_false}>
              <View style={styles.details_ico}>
                {element["direction_img"] in ico_path ? (
                  (() => {
                    switch (ico_path[element["direction_img"]]["type"]) {
                      case "Feather":
                        return (
                          <Feather
                            name={ico_path[element["direction_img"]]["name"]}
                            size={50}
                            color="black"
                          />
                        );
                      case "MaterialIcons":
                        return (
                          <MaterialIcons
                            name={ico_path[element["direction_img"]]["name"]}
                            size={50}
                            color="black"
                          />
                        );
                      default:
                    }
                  })()
                ) : (
                  <Text style={{ color: "red" }}>
                    {element["direction_img"]} not exist!
                  </Text>
                )}
              </View>
              <View style={styles.details_txt}>
                <Text style={{ fontWeight: "700" }}>
                  {element["text_section"]}
                </Text>
              </View>
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "grey",
  },
  route: {
    flex: 1,
  },
  both_ends_true: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "yellow",
  },
  both_ends_false: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "green",
  },
  details_ico: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  details_txt: {
    flex: 3,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "grey",
    marginVertical: 10,
    marginHorizontal: 20,
  },
});
