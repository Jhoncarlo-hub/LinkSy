import { useState, useEffect, useRef } from 'react'
import { View, Text, TouchableOpacity, StatusBar, Alert, PermissionsAndroid, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { createAgoraRtcEngine, IRtcEngine, ChannelProfileType, ClientRoleType } from 'react-native-agora'

const AGORA_APP_ID = '3243713a187c483591fcc9be1bbb8d28'

export default function CallScreen({ route, navigation }: any) {
  const { channelId, isVideo, callerName, user } = route.params
  const [joined, setJoined] = useState(false)
  const [remoteUid, setRemoteUid] = useState<number | null>(null)
  const [muted, setMuted] = useState(false)
  const [videoOff, setVideoOff] = useState(!isVideo)
  const [callDuration, setCallDuration] = useState(0)
  const agoraEngineRef = useRef<IRtcEngine | null>(null)
  const timerRef = useRef<any>(null)

  useEffect(() => {
    requestPermissions().then(() => setupVideoSDKEngine())
    return () => {
      agoraEngineRef.current?.leaveChannel()
      agoraEngineRef.current?.release()
    }
  }, [])

  useEffect(() => {
    if (joined) {
      timerRef.current = setInterval(() => setCallDuration(p => p + 1), 1000)
    }
    return () => clearInterval(timerRef.current)
  }, [joined])

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        PermissionsAndroid.PERMISSIONS.CAMERA,
      ])
    }
  }

  const setupVideoSDKEngine = async () => {
    try {
      const agoraEngine = createAgoraRtcEngine()
      agoraEngineRef.current = agoraEngine
      agoraEngine.initialize({ appId: AGORA_APP_ID })

      agoraEngine.registerEventHandler({
        onJoinChannelSuccess: () => setJoined(true),
        onUserJoined: (_connection, uid) => setRemoteUid(uid),
        onUserOffline: () => { setRemoteUid(null); endCall() },
      })

      if (isVideo) agoraEngine.enableVideo()
      await agoraEngine.joinChannel('', channelId, 0, {
        channelProfile: ChannelProfileType.ChannelProfileCommunication,
        clientRoleType: ClientRoleType.ClientRoleBroadcaster,
      })
    } catch (e) {
      console.log(e)
      Alert.alert('Error', 'Failed to start call')
      navigation.goBack()
    }
  }

  const endCall = async () => {
    clearInterval(timerRef.current)
    agoraEngineRef.current?.leaveChannel()
    navigation.goBack()
  }

  const toggleMute = () => {
    agoraEngineRef.current?.muteLocalAudioStream(!muted)
    setMuted(!muted)
  }

  const toggleVideo = () => {
    agoraEngineRef.current?.muteLocalVideoStream(!videoOff)
    setVideoOff(!videoOff)
  }

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0')
    const sec = (s % 60).toString().padStart(2, '0')
    return `${m}:${sec}`
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0f1117' }}>
      <StatusBar barStyle="light-content" />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <Text style={{ color: 'white', fontSize: 32, fontWeight: '700' }}>{callerName?.[0]?.toUpperCase() || '?'}</Text>
        </View>
        <Text style={{ color: 'white', fontSize: 24, fontWeight: '700', marginBottom: 8 }}>{callerName}</Text>
        <Text style={{ color: '#9ca3af', fontSize: 14 }}>
          {!joined ? 'Connecting...' : remoteUid ? formatDuration(callDuration) : 'Waiting for other user...'}
        </Text>
        {isVideo && <Text style={{ color: '#6366f1', fontSize: 12, marginTop: 8 }}>📹 Video Call</Text>}
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingBottom: 40 }}>
        <TouchableOpacity onPress={toggleMute} style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: muted ? '#ef4444' : '#1e2433', alignItems: 'center', justifyContent: 'center', marginHorizontal: 12 }}>
          <Text style={{ fontSize: 24 }}>{muted ? '🔇' : '🎤'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={endCall} style={{ width: 70, height: 70, borderRadius: 35, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center', marginHorizontal: 12 }}>
          <Text style={{ fontSize: 28 }}>📵</Text>
        </TouchableOpacity>
        {isVideo && (
          <TouchableOpacity onPress={toggleVideo} style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: videoOff ? '#ef4444' : '#1e2433', alignItems: 'center', justifyContent: 'center', marginHorizontal: 12 }}>
            <Text style={{ fontSize: 24 }}>{videoOff ? '📷' : '🎥'}</Text>
          </TouchableOpacity>
        )}
        {!isVideo && (
          <TouchableOpacity style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: '#1e2433', alignItems: 'center', justifyContent: 'center', marginHorizontal: 12 }}>
            <Text style={{ fontSize: 24 }}>🔊</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  )
}