studentIDReader.js
==========

* FeliCaによるICタグを読み取り、その日時などをファイルに記録することを、基本的な機能として構築されたアプリケーション。授業の履修者リストのCSVファイルを読み取り、その履修者をFeliCa学生証を用いて出席確認をし、その状況をWebブラウザを通じて提示する、という内容の運用をすることができる。
* node.js上に構築されているため、マルチプラットフォームで運用可能である。動作に必要な各種のライブラリは、npm installの実行により、自動的にインストールされる。
* FeliCaの読み取り用ライブラリとして、OSX や Linux では libpafeに、Windowsでは libpasori 依存した形で動作をする。そのため、libpafeまたはlibpasoriが対応しているFeliCaリーダーをハードウェアとして用意する必要がある。
* ユーザインターフェイスとして、規定のブラウザをAJAX的に利用する。設定ファイルをブラウザ上にファイルドラッグ&ドロップすることで動作を開始し、読み取り状況はjQueryを用いた表示で更新されていくしくみになっている。


インストール方法
===========

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

studentIDReader.js ファイル内の定数宣言などで必要な設定を行う（任意）。


利用方法
=======

## ハードウェアの準備

PaSoRiデバイスをUSBポートに接続する。

## 起動

Windows環境では、
studentIDReader.batファイルをダブルクリックする。

MacやLinuxでは、consoleからsh studentIDReader.bat のように起動用スクリプト を実行する。
自動的に規定のブラウザが開き、初期設定待ちの画面が表示される。


## 初期設定

設定ファイルをブラウザ上にファイルドラッグ&ドロップすることで動作を開始する。


## 読み取り

PaSoRiデバイスに、設定ファイルで登録済みのFeliCaカードをかざすことで、読み取りを実施する。

読み取り状況は、ブラウザ上で表示が更新されていく。

FeliCaカードを読み取るたびに、読み取り内容が表示され、自動的に画面がスクロールし、読み取り状況に応じたサウンドを再生する。

## 読み取り結果の利用

読み取り結果はvarディレクトリ以下に、yyyy-mm-dd-wday-time.csv.txtというファイル名で、CSV形式のファイルとして追記的に保存されていく。ファイル名のwdayは曜日、timeは大学の1〜6時限に対応した数値が示される。
コンソール上でCtrl-Cを押すことで運用を終了する。

TODO
======

* https://github.com/kubohiroya/studentIDReader.js/issues?milestone=1&state=open
