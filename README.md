依存するライブラリのインストール(Linux,MacOSXの場合に必要、Windowsでは不要)
==========

## libusbのインストール

1. http://www.libusb.org/ からソースコードを取得して自前でビルド・インストールをするか、パッケージマネージャを利用して apt-get install libusb-1.0.0-dev のようにしてインストールを行う。

## libpafe(複数台数同時読み取り対応版)のインストール

1. ワーキングディレクトリで git clone https://github.com/kubohiroya/libpafe を実行してlibpafeのソースコードを取得する．
2. (cd libpafe; make && sudo make install) を実行し，libpafeをビルド・インストールする．


node.jsのインストール
===========

## node.js, npm, node-gyp のインストール

1. apt-get install nodejs
1. apt-get install npm
2. npm install node-gyp


## studentIDReader.jsのインストール

1. ワーキングディレクトリで git clone https://github.com/kubohiroya/studentIDReader.js を実行してstudentIDReader.jsのソースコードを取得する．
2. (cd studentIDReader.js; npm install) を実行する．
 

## node-libpafe のインストール

1. (cd studentIDReader/node_modules ; git clone https://github.com/kubohiroya/node-libpafe ; cd node-libpafe ; node-gyp rebuild ) を実行する．


初期設定
==========

ディレクトリ etc/ 以下に、.xlsx ファイル、.csv ファイルを用意する。

ディレクトリ config/ 以下のsample.jsをコピーして起動用のスクリプトを作成し、このスクリプトファイル内で必要な設定を行う。


運用
===========

PaSoRiをUSBポートに接続する

初期設定で作成した起動用スクリプトのファイル名が、例えば、script/2013AutumnWed3.js であるなら、node script/2013AutumnWed3.js のように起動用スクリプト を実行して、読み取りを開始する。このとき、自動的に規定のブラウザが開き、読み取り状況が表示される。

学生証を読み取ると、ブラウザ上で読み取り状況の表示が更新されていく。
読み取り実行時には、自動的に画面がスクロールし、読み取り状況に応じたサウンドを再生する。
また、読み取り結果がvarディレクトリ以下にCSVとして保存される。


TODO
==========

* 現在の実装では、クライアント側で起動時に表示される教員名・授業名・履修者数などは、
　サーバ側からダミーとして固定の値が送信され表示されている。
　教員のIDカードの認証に応じて、現在の曜日時限の情報をもとにMoodle上の授業情報を取得し、教員名・授業名・履修者数など設定できるようにするべき。

* HTML/CSS/jQueryによる見た目・アニメーション、もっと格好良いものにしたい。
