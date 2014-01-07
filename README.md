studentIDReader.js
==========

* FeliCaによるICタグを読み取り、その日時などをファイルに記録することを、基本的な機能として構築されたアプリケーション。授業の履修者リストのCSVファイルを読み取り、その履修者をFeliCa学生証を用いて出席確認をし、その状況をWebブラウザを通じて提示する、という内容の運用をすることができる。
* node.js上に構築されているため、マルチプラットフォームで運用可能である。動作に必要な各種のライブラリは、npm installの実行により、自動的にインストールされる。
* FeliCaの読み取り用ライブラリとして、OSX や Linux では libpafeに、Windowsでは felicalib 依存した形で動作をする。そのため、libpafeまたはfelicalibが対応しているFeliCaリーダーをハードウェアとして用意する必要がある。
* ユーザインターフェイスとして、規定のブラウザをAJAX的に利用する。設定ファイルをブラウザ上にファイルドラッグ&ドロップすることで動作を開始し、読み取り状況はjQueryを用いた表示で更新されていくしくみになっている。


インストール方法
===========

## node.jsのインストール

### node.js, npm, node-gyp のインストール

Windows, OS Xなどでは、Node.jsのインストーラを実行すればOK。

http://nodejs.org/download/

* You need to have Microsoft Visual Studio 2012 or 2010 (Express edition is fine) as well as Python 2.6 or 2.7. Openssl is not required. Make sure that python is in your PATH.

Linuxでは、たとえば、Debian系の場合には、次のように実行する。

1. apt-get install nodejs
2. apt-get install npm
3. npm install node-gyp


### studentIDReader.jsのインストール

1. ワーキングディレクトリで git clone https://github.com/kubohiroya/studentIDReader.js を実行してstudentIDReader.jsのソースコードを取得する。
2. (cd studentIDReader.js; npm install) を実行する。
 

## 初期設定

studentIDReader.js ファイル内の定数や、
lib/util/dateUtil.js ファイル内のACADEMIC_TIME, EARLY_MARGIN, LATE_MARGIN定数で必要な設定を行う。

```JavaScript
   //大学の授業の開始時間 [[時,分],[時,分]...]
   var ACADEMIC_TIME = [
       [0, 0],
       [9, 0],
       [10, 40],
       [13, 10],
       [14, 50],
       [16, 30],
       [18, 10]
   ];
   
   //授業開始時間よりも何分前から出席を取るか？
   var EARLY_MARGIN = 15;
   //授業開始時間から何分後まで出席を取るか？
   var LATE_MARGIN = 90;
```

利用方法
=======

## ハードウェアの準備

PaSoRiデバイスをUSBポートに接続する。

## 起動

Windows環境では、
bin\studentIDReader.batファイルをダブルクリックする。

MacやLinuxでは、consoleからbin/studentIDReader のように実行する。
自動的に規定のブラウザが開き、初期設定待ちの画面が表示される。

なお、初期設定待ちの画面上に表示されたQRコードをiOSやAndroidなどのスマートフォンを用いて撮影し、抽出されたURLを開くことで、教員用モニタ画面を開くこともできる。

## 初期設定

次の２つのうち、いずれかの方法で初期設定を行う。

* 履修者名簿ファイルへのパスを起動時のコマンドライン引数で指定する。
* 履修者名簿ファイルをブラウザ上にファイルドラッグ&ドロップまたはブラウザ画面上のファイルセレクタにより選択する。


## 読み取り

PaSoRiデバイスに、設定ファイルで登録済みのFeliCaカードをかざすことで、読み取りを実施する。

読み取り状況は、ブラウザ上で表示が更新されていく。

FeliCaカードを読み取るたびに、読み取り内容が表示され、自動的に画面がスクロールし、読み取り状況に応じたサウンドを再生する。

## 読み取り結果の利用

読み取り結果はvarディレクトリ以下に、yyyy-mm-dd-wday-time.csv.txtというファイル名で、CSV形式のファイルとして追記的に保存されていく。ファイル名のwdayは曜日、timeは大学の1〜6時限に対応した数値が示される。
コンソール上でCtrl-Cを押すことで運用を終了する。

## 読み取り結果のExcelファイル化

次のコマンドを実行することで、読み取り結果のExcelファイル化を行う。

bin/updateAttendeeTableh 履修者名簿ファイルの保存されているディレクトリ 読み取り結果の保存されているディレクトリ 読み取り結果のExcelファイル出力先のディレクトリ

読み取り結果のExcelファイルは、授業コード.xlsx というファイル名で出力される。

それぞれのExcelファイルは各行が学生を、各列が出欠を取った日時の時限を表した形で、3つのシートから構成される。

* 1番目のシート: attendee : 出席確認をした場合は1, そうでない場合には0
* 2番目のシート: time : 出席確認をした 時:分
* 3番目のシート: time_exceed : 出席確認をした 時:分の授業開始時間からの遅れ

TODO
======

* https://github.com/kubohiroya/studentIDReader.js/issues?milestone=1&state=open
