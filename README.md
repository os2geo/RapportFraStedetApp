Opret en konfigurationsfil couchapp-web.json med indholdet (udskift username og password):
```json
 {
     "host": "geo.os2geo.dk",
     "port": "80",
     "attachments": "www",
     "auth": {
         "username": "",
         "password": ""
     }
 }
```
#Sign Android apk
```
#!/bin/bash

echo "Building Release mode for android..."
cordova build android --release

rm -rf release_files
mkdir release_files
cp platforms/android/build/outputs/apk/android-x86-release-unsigned.apk release_files/
cp platforms/android/build/outputs/apk/android-armv7-release-unsigned.apk release_files/
echo "Copied files to release_files"


read -p "Press any key to jarsign... " -n1 -s
cd release_files/
jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore ~/Documents/android/RapportFraStedet.keystore -storepass PASSWORD android-x86-release-unsigned.apk rapportfrastedet
jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore ~/Documents/android/RapportFraStedet.keystore -storepass PASSWORD android-armv7-release-unsigned.apk rapportfrastedet

read -p "Press any key to zipalign... " -n1 -s
~/Library/Android/sdk/build-tools/23.0.1/zipalign -v 4 android-x86-release-unsigned.apk android-x86-release-signed.apk
~/Library/Android/sdk/build-tools/23.0.1/zipalign -v 4 android-armv7-release-unsigned.apk android-armv7-release-signed.apk
rm -f android-x86-release-unsigned.apk android-armv7-release-unsigned.apk

cd ..
```


