# ZEGO Video and Audio Call Component for React

This component provides a ready-to-use implementation of the ZEGO Express SDK for audio and video calls in a React application.

## Features

- Audio and video calls with real-time communication
- Room-based communication system
- Publish and receive streams from multiple users
- Control microphone and camera
- Built-in UI for local and remote video display
- Easy to integrate with existing React applications

## Prerequisites

Before using this component, make sure you have:

1. Created a project in the ZEGOCLOUD Console and obtained a valid AppID and AppSign
2. Integrated the necessary packages:
   - zego-express-engine-webrtc
   - zego-zim-web (optional, for messaging)

## Installation

The component uses the following dependencies:

```bash
npm install zego-express-engine-webrtc antd
```

## Usage

There are two main ways to use this component:

### 1. Using the simplified ZegoVideoCall component

The `ZegoVideoCall` component provides a ready-to-use interface with minimal setup:

```tsx
import { ZegoVideoCall } from "./components/zego/zego";

const MyComponent = () => {
  return (
    <ZegoVideoCall
      appID={123456789} // Your ZEGO AppID
      serverSecret="your_server_secret_here" // Your ZEGO Server Secret
      roomID="room-123" // A unique room identifier
      userID="user-456" // A unique user identifier
      userName="John Doe" // User's display name
    />
  );
};
```

### 2. Using the core ZegoComponent with more control

For more advanced usage, you can use the core component with a ref to control its behavior:

```tsx
import React, { useRef } from "react";
import ZegoComponent, { ZegoUtils } from "./components/zego/zego";

const MyComponent = () => {
  const zegoRef = useRef(null);
  const appID = 123456789; // Your ZEGO AppID
  const serverSecret = "your_server_secret_here";
  const roomID = "room-123";
  const userID = "user-456";
  const userName = "John Doe";

  // Generate token (in production, this should be done server-side)
  const token = ZegoUtils.generateToken(appID, serverSecret, userID);

  const startCall = async () => {
    if (!zegoRef.current) return;

    // Login to room
    await zegoRef.current.loginRoom();

    // Create stream
    const stream = await zegoRef.current.createStream();

    // Publish stream
    await zegoRef.current.startPublishingStream();
  };

  return (
    <div>
      <button onClick={startCall}>Start Call</button>

      <ZegoComponent
        ref={zegoRef}
        appID={appID}
        server="wss://webliveroom-test.zego.im/ws" // Use production server in real deployment
        roomID={roomID}
        userID={userID}
        userName={userName}
        token={token}
      />
    </div>
  );
};
```

## Component API

### ZegoVideoCall Props

| Prop         | Type   | Required | Description                                         |
| ------------ | ------ | -------- | --------------------------------------------------- |
| appID        | number | Yes      | Your ZEGO AppID obtained from the ZEGOCLOUD Console |
| serverSecret | string | Yes      | Your ZEGO Server Secret for token generation        |
| roomID       | string | Yes      | A unique identifier for the call room               |
| userID       | string | Yes      | A unique identifier for the current user            |
| userName     | string | Yes      | Display name for the current user                   |

### ZegoComponent Props

| Prop              | Type     | Required | Description                                                              |
| ----------------- | -------- | -------- | ------------------------------------------------------------------------ |
| appID             | number   | Yes      | Your ZEGO AppID obtained from the ZEGOCLOUD Console                      |
| server            | string   | Yes      | ZEGO server URL, usually "wss://webliveroom-test.zego.im/ws" for testing |
| roomID            | string   | Yes      | A unique identifier for the call room                                    |
| userID            | string   | Yes      | A unique identifier for the current user                                 |
| userName          | string   | Yes      | Display name for the current user                                        |
| token             | string   | Yes      | Authentication token for ZEGO services                                   |
| onRoomStateUpdate | function | No       | Callback for room state changes                                          |
| onUserUpdate      | function | No       | Callback for user joining/leaving events                                 |
| onStreamUpdate    | function | No       | Callback for stream add/remove events                                    |

### ZegoComponent Methods (via Ref)

| Method                | Parameters                         | Return                       | Description                       |
| --------------------- | ---------------------------------- | ---------------------------- | --------------------------------- |
| loginRoom             | -                                  | Promise<boolean>             | Log into the specified room       |
| logoutRoom            | -                                  | void                         | Log out from the current room     |
| createStream          | (video?: boolean, audio?: boolean) | Promise<MediaStream \| null> | Create a local media stream       |
| startPublishingStream | (customStreamID?: string)          | Promise<boolean>             | Start publishing the local stream |
| stopPublishingStream  | -                                  | void                         | Stop publishing the local stream  |
| toggleMicrophone      | -                                  | boolean \| undefined         | Toggle microphone on/off          |
| toggleCamera          | -                                  | boolean \| undefined         | Toggle camera on/off              |

## Important Notes

1. **Token Generation**: In a production environment, tokens should be generated server-side for security reasons. The `ZegoUtils.generateToken()` function provided is a simplified implementation for development purposes only.

2. **Browser Compatibility**: The component checks for WebRTC compatibility, but some features may not work in all browsers. Refer to the [ZEGO Express SDK documentation](https://docs.zegocloud.com/article/3396) for browser compatibility details.

3. **Mobile Support**: For optimal mobile experience, additional considerations may be needed for autoplay policies and camera/microphone permissions.

## Example

See the `ZegoDemo.tsx` page for a complete implementation example.

## Troubleshooting

- **No video appears**: Check camera permissions and ensure the browser supports WebRTC
- **No audio**: Verify microphone permissions and that the audio is not muted
- **Connection issues**: Confirm that you're using the correct AppID and token

## Resources

- [ZEGOCLOUD Documentation](https://docs.zegocloud.com/)
- [ZEGO Express SDK Web API Reference](https://doc-en.zego.im/article/13924)
