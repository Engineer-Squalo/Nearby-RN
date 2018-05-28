import React, { Component } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  View,
  ListView,
  ScrollView,
  TouchableHighlight
} from 'react-native';
var sha256 = require('js-sha256');


import firebase, { Firebase } from 'react-native-firebase';

var hash = function(s) {
  /* Simple hash function. */
  var a = 1, c = 0, h, o;
  if (s) {
      a = 0;
      /*jshint plusplus:false bitwise:false*/
      for (h = s.length - 1; h >= 0; h--) {
          o = s.charCodeAt(h);
          a = (a<<6&268435455) + o + (o<<14);
          c = a & 266338304;
          a = c!==0?a^c>>21:a;
      }
  }
  return String(a);
};

const config = {
  apiKey: 'AIzaSyBYp-XdhcQwPDhwMFz2KcL7a3ph0LD4cDc',
  messagingSenderId: '1061548832111',
  storageBucket: 'nearby-9b6e3.appspot.com',
  databaseURL: 'https://nearby-9b6e3.firebaseio.com',
  clientId: '1061548832111-benbui81f6580fcebfl1dmjkqfos88ub.apps.googleusercontent.com',
  appId: '1:1061548832111:ios:ae766799361c41e9',
  projectId: 'nearby-9b6e3'
}

const instructions = Platform.select({
  ios: 'Press Cmd+R to reload,\n' +
    'Cmd+D or shake for dev menu',
  android: 'Double tap R on your keyboard to reload,\n' +
    'Shake or press menu button for dev menu',
});


class ListItem extends Component {
  render() {
    const arr = [this.props.item.hash1, this.props.item.hash2];
    const isClose = arr.indexOf(this.props.hash1)>-1 || arr.indexOf(this.props.hash2)>-1 ? 1 : 0;
    return (
      <View style={{flex: 1,}}>
        <TouchableHighlight 
          style={{flex: 1,}}
          onPress={this.props.onPress}
        >
          <View style={{flex: 1, flexDirection: 'row', justifyContent: 'center', alignContent: 'space-between', margin: 5}}>
            <View style={{flex: 9}}>
              <Text 
                style={{color: 'dodgerblue', textAlign: 'left'}}
              >
                {this.props.item.title==this.props.uid ? "me" : this.props.item.title}
              </Text>
            </View>
            <View style={{flex: 1}}>
              <Text style={{color: 'black', textAlign: 'right'}}>{isClose} </Text>
            </View>
          </View>
        </TouchableHighlight>
      </View>
    );
  }
}


type Props = {};
export default class App extends Component<Props> {
  itemsRef = null;
  credentialRef = null;
  constructor(props) {
    super(props);
    this.state = {
      dataSource: new ListView.DataSource({
        rowHasChanged: (row1, row2) => row1 !== row2,
      }),
      latitude: null,
      longitude: null,
      error: null,
      initialPosition: 'unknown',
      lastPosition: 'unknown',
    }
  }
  watchID: ?number = null;

  listenForItems(itemsRef) {
    itemsRef.on('value', (snap) => {
      var items = [];
      snap.forEach((child) => {
        items.push({
          // title: child.val().creation,
          title: child.key,
          _key: child.key,
          hash1: child.val().hash1,
          hash2: child.val().hash2,
        });
      });

      this.setState({
        dataSource: this.state.dataSource.cloneWithRows(items)
      });

    });
  }

  pushToTheServer(obj) {
    this.itemsRef = firebase.app().database().ref('users-locations/'+this.credentialRef.user._user.uid);
    this.itemsRef.update({
      hash1: obj.hash1,
      hash2: obj.hash2
    }).then( (val) => {
      if(__DEV__) console.log(val, "--> OK");
      this.getPos();
    }).catch( (error) => {
      if(__DEV__) console.log(error, "---> error");
    })
  }

  componentDidMount() {
    this.setState({
      dataSource: this.state.dataSource.cloneWithRows([{ title: 'Empty' }])
    })
    firebase.auth()
    .signInAnonymouslyAndRetrieveData()
    .then(credential => {
      if(__DEV__) console.log(credential, credential.user);
      if (credential && !this.credentialRef) {
        this.credentialRef = credential;
        if(!this.itemsRef){
            this.listenForItems(firebase.app().database().ref('users-locations'));
            this.itemsRef = firebase.app().database().ref('users-locations/'+credential.user._user.uid);
            this.itemsRef.update({
              refreshToken: credential.user._user.refreshToken,
              creation: credential.user._user.metadata.creationTime
            }).then( (val) => {
              if(__DEV__) console.log(val, "--> OK");
              this.getPos();
            }).catch( (error) => {
              if(__DEV__) console.log(error, "---> error");
            })
        }
      }
    }).catch((error) => {
      if(__DEV__) console.log("error: ", error);
    })
  }

  getPos() {
  //   navigator.geolocation.getCurrentPosition(
  //     (position) => {
  //        const initialPosition = JSON.stringify(position);
  //        this.setState({ initialPosition });
  //     },
  //     (error) => alert(error.message),
  //     { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 }
  //  );
   this.watchID = navigator.geolocation.watchPosition((position) => {
      const lastPosition = JSON.stringify(position);
      const longitude = position.coords.longitude;
      const latitude = position.coords.latitude;
      const timestamp = position.timestamp;

      const preclong1 = longitude;
      const preclong11 = longitude + 1;

      const preclat1 = latitude;
      const preclat11 = latitude + 1;

      const sum1 = preclong1 +""+ preclat1;
      const sum2 = preclong11 +""+ preclat11;

      var hash1 = sha256.create();
      hash1.update(sum1.toString());

      var hash2 = sha256.create();
      hash2.update(sum2.toString())

      this.setState({
        hash1: hash1.hex(),
        sum1,
        preclong1,
        preclat1,
      });
      this.setState({
        hash2: hash2.hex(),
        sum2,
        preclong11,
        preclat11,
      });

      this.pushToTheServer({
        hash1: hash1.hex(),
        hash2: hash2.hex()
      })
      
      this.setState({ 
        lastPosition, 
        longitude:position.coords.longitude, 
        latitude: position.coords.latitude,
        timestamp: position.timestamp,
      });

      const uid = this.credentialRef.user._user.uid;
      this.setState({uid});
      // const obj = { position }
      // this.itemsRef.set(obj);
    },
    (error) => this.setState({ error: error.message }),
    { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000, distanceFilter: 10 },);
  }

  fakeUsers(numOfFakeUsers) {
    for( var fakeid = 0; fakeid <= numOfFakeUsers; fakeid++ ) {

        const longitude = 123.123;
        const latitude = 66.6;
        const timestamp = this.state.timestamp;

        const preclong1 = longitude;
        const preclong11 = longitude + 1;

        const preclat1 = latitude;
        const preclat11 = latitude + 1;

        const sum1 = preclong1 +""+ preclat1;
        const sum2 = preclong11 +""+ preclat11;

        var hash1 = sha256.create();
        hash1.update(sum1.toString());

        var hash2 = sha256.create();
        hash2.update(sum2.toString());


    }
  }

  componentWillUnmount() {
    navigator.geolocation.clearWatch(this.watchId);
  }


  _renderItem(item) {
    return (
      <ListItem 
        item={item} 
        onPress={() => {
          
        }}
        hash1={this.state.hash1} 
        hash2={this.state.hash2}
        uid={this.state.uid}
      />
    );
  }

  render() {
    return (
      <View style={styles.container}>
        <ScrollView
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.05)',
          }}
        >
          <View style = {styles.pos}>

            <Text style = {styles.boldText}>
               Current position:
            </Text>

            <Text>
              Longitude: {this.state.preclong1}
            </Text>
            <Text>
              Longitude: {this.state.preclong11}
            </Text>
            <Text>
              LongitudeSum: {this.state.sum1}
            </Text>
            

            <Text>
              Latitude: {this.state.preclat1}
            </Text>
            <Text>
              Latitude: {this.state.preclat11}
            </Text>
            <Text>
              LatitudeSum: {this.state.sum2}
            </Text>

            <Text>
              Timestamp: {this.state.timestamp}
            </Text>

            <Text>
              Hash1: {this.state.hash1}
            </Text>

            <Text>
              Hash2: {this.state.hash2}
            </Text>
         </View>

        </ScrollView>

        <ListView
          dataSource={this.state.dataSource}
          renderRow={this._renderItem.bind(this)}
          style={{flex: 1}}
        />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  welcome: {
    fontSize: 20,
    textAlign: 'center',
    margin: 10,
  },
  instructions: {
    textAlign: 'center',
    color: '#333333',
    marginBottom: 5,
  },
  pos: {
    flex: 1,
    alignItems: 'center',
    marginTop: 50
 },
 boldText: {
    fontSize: 30,
    color: 'red',
 }
});
