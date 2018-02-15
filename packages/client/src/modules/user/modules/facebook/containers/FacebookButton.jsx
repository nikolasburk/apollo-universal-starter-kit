import React from 'react';
import url from 'url';
import { View, StyleSheet, Linking } from 'react-native';
import faFacebookSquare from '@fortawesome/fontawesome-free-brands/faFacebookSquare';
import FontAwesomeIcon from '@fortawesome/react-fontawesome';
import { Button } from '../../../../common/components/index';

const { protocol, hostname, port } = url.parse(__BACKEND_URL__);
let serverPort = process.env.PORT || port;
if (__DEV__) {
  serverPort = '3000';
}

const facebookLogin = () => {
  Linking.openURL(`http://192.168.0.155:8080/auth/facebook/callback`);
};

const FacebookButton = () => {
  return (
    <View>
      <Button type="button" style={styles.submit} onPress={facebookLogin}>
        Login with Facebook
      </Button>
    </View>
  );
};

const FacebookLink = () => {
  return (
    <Button color="link" onPress={facebookLogin} style={{ margin: 10 }}>
      Login with Facebook
    </Button>
  );
};

const FacebookIcon = () => {
  return <FontAwesomeIcon icon={faFacebookSquare} size="3x" style={{ margin: 10 }} onPress={facebookLogin} />;
};

const FacebookComponent = props => {
  switch (props.type) {
    case 'button':
      return <FacebookButton />;
    case 'link':
      return <FacebookLink />;
    case 'icon':
      return <FacebookIcon />;
    default:
      return <FacebookButton />;
  }
};

const styles = StyleSheet.create({
  submit: {
    marginTop: 10,
    alignSelf: 'center'
  }
});

export default FacebookComponent;
