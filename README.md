studentIDReader.js
==========

* FeliCaによるICタグ方式を読み取り、その日時を記録するアプリケーション。授業の履修者リストを読み取り、その履修者のFeliCa学生証を用いて出席確認をするという形で運用することができる。
* node.js上に構築されているため、マルチプラットフォームで運用可能である。動作に必要な各種のライブラリは、npm installの実行により、自動的にインストールされる。
* FeliCaの読み取り用ライブラリとして、OSX や Linux では libpafeに、Windowsでは libpasori 依存した形で動作をする。そのため、libpafeまたはlibpasoriが対応しているFeliCaリーダーをハードウェアとして用意する必要がある。
* ユーザインターフェイスとして、規定のブラウザをAJAX的に利用する。設定ファイルをブラウザ上にファイルドラッグ&ドロップすることで動作を開始し、読み取り状況はjQueryを用いた表示で更新されていくしくみになっている。


## 依存するライブラリのインストール(Linux,MacOSXの場合に必要、Windowsでは不要)

### libusbのインストール

1. http://www.libusb.org/ からソースコードを取得して自前でビルド・インストールをするか、パッケージマネージャを利用して apt-get install libusb-1.0.0-dev のようにしてインストールを行う。

### libpafe(複数台数同時読み取り対応版)のインストール

1. ワーキングディレクトリで git clone https://github.com/kubohiroya/libpafe を実行してlibpafeのソースコードを取得する。
2. (cd libpafe; make && sudo make install) を実行し、libpafeをビルド・インストールする。


## node.jsのインストール

### node.js, npm, node-gyp のインストール

1. apt-get install nodejs
1. apt-get install npm
2. npm install node-gyp


### studentIDReader.jsのインストール

1. ワーキングディレクトリで git clone https://github.com/kubohiroya/studentIDReader.js を実行してstudentIDReader.jsのソースコードを取得する。
2. (cd studentIDReader.js; npm install) を実行する。
 

### node-libpafe のインストール

1. (cd studentIDReader/node_modules ; git clone https://github.com/kubohiroya/node-libpafe ; cd node-libpafe ; node-gyp rebuild ) を実行する。


## 初期設定

studentIDReader.js ファイル内の定数宣言などで必要な設定を行う。


## 運用

PaSoRiをUSBポートに接続する。

node studentIDReader.js のように起動用スクリプト を実行して、読み取りを開始する。このとき、自動的に規定のブラウザが開き、読み取り状況が表示される。

学生証を読み取ると、ブラウザ上で読み取り状況の表示が更新されていく。
読み取り実行時には、自動的に画面がスクロールし、読み取り状況に応じたサウンドを再生する。
読み取り結果はvarディレクトリ以下に、yyyy-mm-dd-wday-time.csv.txtというファイル名で、CSV形式のファイルとして追記的に保存されていく。ファイル名のwdayは曜日、timeは大学の1〜6時限に対応した数値が示される。
コンソール上でCtrl-Cを押すことで運用を終了する。

node studentIDReader.js を実行することで、読み取りを再開できる。 

## TODO

* https://github.com/kubohiroya/studentIDReader.js/issues?milestone=1&state=open
