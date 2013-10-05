インストール
==========

## libusbのインストール

1. apt-get install libusb-1.0.0-dev 

## libpafe(複数台数同時読み取り対応版)のインストール

2. ワーキングディレクトリで git clone https://github.com/kubohiroya/libpafe を実行してlibpafeのソースコードを取得する．
3. cd libpafe; make && sudo make install を実行し，libpafeをビルド・インストールする．

## node.js, npm, node-gyp のインストール

1. apt-get install nodejs
1. apt-get install npm
2. npm install node-gyp


## studentIDReader.jsのインストールとセットアップ

1. ワーキングディレクトリで git clone https://github.com/kubohiroya/studentIDReader.js を実行してstudentIDReader.jsのソースコードを取得する．
2. (cd studentIDReader.js; npm install) を実行する．
3. (cd studentIDReader/node_modules ; git clone https://github.com/kubohiroya/node-libpafe ; cd node-libpafe ; node-gyp rebuild ) を実行する．


初期設定
==========

ディレクトリ etc/ 以下に、.xlsx ファイル、.csv ファイルを用意する。
それぞれのカラムは、student_id , fullname , furigana (, gender)の並びとする。

config.js ファイル内の module.exports.FILENAMES で、先に用意したカラムのファイル名を指定する。


運用
===========

PaSoRiをUSBポートに接続する

node studentIDReader.js を実行し、読み取りを開始する。このとき、自動的に規定のブラウザが開き、読み取り状況が表示される。

学生証を読み取ると、ブラウザ上で読み取り状況の表示が更新されていく。
読み取り実行時には、自動的に画面がスクロールし、読み取り状況に応じたサウンドを再生する。
また、読み取り結果がvarディレクトリ以下にCSVとして保存される。


TODO
==========

* クライアント側では、起動時に、授業名・教員名・履修者数などの情報を表示できるように
　なっているが、サーバ側では、現在の実装では、ダミーとして固定の値を送信している。
　現在の曜日時限に対応した授業名を選んで表示できるようにするべきか、要検討。
　もしこれをやるなら、毎学期の運用準備として、
　その学期に開講される授業一覧のCSVファイルを用意するというタスクが発生する。
　この授業一覧のCSVファイルは、起動後にブラウザ上にDragAndDropすると読み込む形となるだろう。

* HTML/CSS/jQueryによる見た目・アニメーション、もっと格好良いものにしたい。
