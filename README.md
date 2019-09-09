
# webrtc-mcu
  一个基于kurento & webRTC构建的直播系统demo
  借鉴了kurento one2many示例
  KMS作为offer，用户作为viewer。
  通过游览器上的kurento util调用node端的kurento client，实现对KMS API的调用，在KMS中构建一条媒体管线。
  每加入一个viewe便在媒体管线中构建一个由playerEndpoint + WebrtcEndpoint组成的端点。
  目前可以将本地视频文件和m3u8直播流作为直播内容。
# 使用方法
1 在ubuntu LTS 上部署KMS
2 安装node.js
3 运行sudo npm install 安装node端kurento client
# 注意
1 在ubuntu上，"postinstall": "cd static && bower install" 要写为 "postinstall": "cd static && bower install --allow-root"
