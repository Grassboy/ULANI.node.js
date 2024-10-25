# ULANI Node.js 函式庫

## 碎碎念

會開發這個玩意，是因為我希望相框呈現的資訊不只是預設的日期   
我希望這個相框能夠顯示"當天每三小時天氣"以及"未來一週天氣"，   
並且能夠隨機挑出我自己精選的照片每小時換圖(精選照片可能不少)   
   
所以便透過自己所學，搭配 ChatGPT 去一步步摸索 ULANI 的資料傳輸模式   
希望能夠不透過官方 App 就能達到換圖的目的   
   
然後更進一步的，就是製作作一個「非官方的 ULANI 操作網頁」   
讓它除了換圖之外，也能夠更快的讓我在相框上加入額外的疊加資訊(ex: 天氣)，   
之後是不是也可以讓其他人開發更多疊加資訊，讓 ULANI 不單純只是日曆功能？   
   
所以，除了早就開發好的 Node.js 函式庫外，   
較符合一般人操作習慣的網頁(個人是命名 UlaniX 啦XD)也在開發中…如下圖XD   
![圖片](https://github.com/user-attachments/assets/8edef350-a3ff-41cd-a2c9-c73d6b6af468)
   
不過…因為各種理由…小弟其實沒有太多時間&動力寫 UlaniX 了0rz...   
想寫的東西其實不少，現在我的 ULANI 可以抓天氣&隨機挑照片我就很開心了…   
   
所以，我想 UlaniX 應該之後會石沉大海吧…   
不過，ULANI Node.js 函式庫的出現，應該會讓未來想開發類似功能的人，省下不少時間…   
所以，在我 Node.js 函式庫開發完快兩年，以及 ULANI 官方看起來已經不在了的現在…   
我決定把這份可以跑的函式庫 Release 出來~   
   
之後 UlaniX 的 code (但 code 很醜喲…) 有需要&有心力的話，可能也會丟上來看有沒有人要接手XDD   

## 系統需求&使用門檻需求

 * Windows 10: 因為我只在 Windows 10 試過可以跑
 * 一台有支援藍牙的電腦: 桌機筆電都行，我的桌機原本沒有藍牙，蝦皮買個藍牙發射器就能用了
 * 一台 ULANI: 經實測，一台電腦只能控制一台 ULANI，不知是不是 ULANI 當初的限制
 * 你要具備 Node.js 基礎: 這個專案只有 Node.js 函式庫，沒有任何 GUI 介面

## 開始安裝
 * git clone 這個專案，先複製一份 ```/src/config.sample.js``` 到 ```/src/config.js``` 
 * 更改 ```/src/config.js``` 裡的 config，最重要的應該是第七行的
 ```
        bluetooth_name: 'ULANI CalendarC0FFEE',     //藍牙裝置名稱
 ```
 要改成你自己的 ULANI 的藍牙裝置名稱
 * 到 windows 的藍芽管理畫面新增藍芽裝置→找到剛才填的裝置名稱→配對，如下圖
 ![圖片](https://github.com/user-attachments/assets/f86e7290-e776-40c1-b8db-b1eded69311c)
 * 到專案資料夾下跑 ```npm install``` 將所需的其他 node.js 套件下載下來
 * ```/src/helloworld.js``` 有附一份可以跑起來的 code，它會示範幫你把第一個相框的圖換掉，換成 ```/img/sample.png``` 的內容

## 具體實作了哪些功能？

hmm...我應該是最關注換圖的功能…所以換圖相關的函式我都盡量包好了，   
具體的可至 ```/src/BLEComm.js``` 277~339 看有哪些函式可用   
然後可至 ```/src/helloworld.js``` 看看範例用法   

## 和官方 App 的差異？

其實我已經很久沒裝 App，不知道 ULANI 目前官方 App 好用到什麼程度，   
不過有幾個功能是這個函式庫自認比官方 App 強大的地方   
   
 * 改善顏色呈現的演算法，同一張圖在相框上的呈現應該比官方 App 順眼，詳見 [先前官方社團的討論](https://www.facebook.com/groups/535715677955824/posts/650182433175814/)
 * 支援相框旋轉功能，可直接指定 ULANI 是直立相框，讓傳進去的圖片都以直立比例呈現 ![圖片](https://github.com/user-attachments/assets/a54fad6d-5a31-444b-af7c-e29b3dcc034b)


## 結論

hmm...其實最理想的狀態就是全部包得好好的讓一般的 ULANI 用戶也能快速上手   
不過我想我是作不出來了XDD 所以把最核心的函式庫放出來降子…   
其實也不知道現在還有哪些人的 ULANI 還在服役啦~   
希望能貢獻一點所學囉~
