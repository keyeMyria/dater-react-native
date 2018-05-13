import { StackNavigator } from 'react-navigation';
import LoginScreen from '../screens/login/login-screen';
import PhoneNumberScreen from '../screens/login/phone-number-screen';
import SmsCodeScreen from '../screens/login/sms-code-screen';
import GenderScreen from '../screens/profile/gender-screen';
import NameScreen from '../screens/profile/name-screen';
import BirthdayScreen from '../screens/profile/birthday-screen';
import UploadPhotoScreen from '../screens/profile/upload-photo-screen';

const LoginNavigator = StackNavigator(
  {
    Login: {
      screen: LoginScreen,
    },
    PhoneNumber: {
      screen: PhoneNumberScreen,
    },
    SmsCode: {
      screen: SmsCodeScreen,
    },
    RegisterGender: {
      screen: GenderScreen,
    },
    RegisterName: {
      screen: NameScreen,
    },
    RegisterBirthday: {
      screen: BirthdayScreen,
    },
    RegisterUploadPhoto: {
      screen: UploadPhotoScreen,
    },
  },
  {
    initialRouteName: 'Login',
    headerMode: 'none',
    header: null,
  },
);

export default LoginNavigator;
