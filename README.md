
# webrtc-mcu
  * 一个基于kurento & webRTC构建的直播系统demo
  * 借鉴了kurento one2many示例
  * KMS作为offer，用户作为viewer。
  * 通过游览器上的kurento util调用node端的kurento client，实现对KMS API的调用，在KMS中构建一条媒体管线。
  * 每加入一个viewe便在媒体管线中构建一个由playerEndpoint + WebrtcEndpoint组成的端点。
  * 目前可以将本地视频文件和m3u8直播流作为直播内容。
# 使用方法
1. 在ubuntu LTS 上部署KMS
2. 安装node.js
3. 运行sudo npm install 
# 注意
1. 在ubuntu上，"postinstall": "cd static && bower install" 要写为 "postinstall": "cd static && bower install --allow-root"
# 参考资料
1. Kurento Tutorials
   1. Node.js - One to many video call
   * https://doc-kurento.readthedocs.io/en/6.11.0/tutorials/node/tutorial-one2many.html
2. JavaScript Kurento Client
   * https://doc-kurento-zh-cn.readthedocs.io/zh_CN/v6.6.1/_static/langdoc/jsdoc/kurento-client-js/index.html
   * http://www.voidcn.com/article/p-rviujpmu-bow.html
3. kurento_utils_js
   * https://doc-kurento.readthedocs.io/en/6.11.0/features/kurento_utils_js.html 
4. How to ues coturn
   * https://doc-kurento.readthedocs.io/en/6.11.0/user/faq.html
5. 中文教程
   1. 比较完整的中文文档
      * https://blog.gmem.cc/webrtc-server-basedon-kurento
   2. Kurento Utils JS
      * http://www.voidcn.com/article/p-rviujpmu-bow.html
   3. https://my.oschina.net/997155658?tab=newest&catalogId=5604714
6. chrome webrtc检查工具 chrome://webrtc-internals/
7. WebRTC和相关技术
   1. Learning WebRTC
   2. https://cloud.tencent.com/developer/article/1403674
   3. P2P ICE https://evilpan.com/2015/12/20/p2p-standard-protocol-ice/
   4. https://cnodejs.org/topic/54745ac22804a0997d38b32d
   5. https://www.liangzl.com/get-article-detail-678.html
   6. P2P技术之STUN、TURN、ICE详解 http://www.52im.net/thread-557-1-1.html
   7. 拓展 - WebRTC 多视频网络拓扑之三种架构 https://www.cnblogs.com/baitongtong/p/10393802.html
   8. SDP https://www.jianshu.com/p/94b118b8fd97