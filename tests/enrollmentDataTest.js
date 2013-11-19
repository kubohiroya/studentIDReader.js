var enrollment_data = require("../libs/enrollmentData.js");

var fs = require("fs");

//var expect = require("expect");

var data = { "1040052": 
   { ayear: "2013",
     semester: "秋学期",
     semester_division: "秋学期",
     wdaytime: "水3",
     id_code: "34502",
     title: "政策情報学概論IV",
     teachername: "久保 裕也",
     department_code: "P",
     grade: "4",
     studentid: "1040052",
     fullname: "冨　永　健　太",
     fullname_en: "TOMINAGA KENTA",
     memo: "",
     logname: "b040052",
     wday: "水",
     time: "3" },
  "1040104": 
   { ayear: "2013",
     semester: "秋学期",
     semester_division: "秋学期",
     wdaytime: "水3",
     id_code: "34502",
     title: "政策情報学概論IV",
     teachername: "久保 裕也",
     department_code: "P",
     grade: "4",
     studentid: "1040104",
     fullname: "臼　倉　敏　彦",
     fullname_en: "USUKURA TOSHIHIKO",
     memo: "",
     logname: "b040104",
     wday: "水",
     time: "3" },
  "1040140": 
   { ayear: "2013",
     semester: "秋学期",
     semester_division: "秋学期",
     wdaytime: "水3",
     id_code: "34502",
     title: "政策情報学概論IV",
     teachername: "久保 裕也",
     department_code: "P",
     grade: "4",
     studentid: "1040140",
     fullname: "池　上　　　魁",
     fullname_en: "IKEGAMI KAI",
     memo: "",
     logname: "b040140",
     wday: "水",
     time: "3" },
  "1140002": 
   { ayear: "2013",
     semester: "秋学期",
     semester_division: "秋学期",
     wdaytime: "水3",
     id_code: "34502",
     title: "政策情報学概論IV",
     teachername: "久保 裕也",
     department_code: "P",
     grade: "3",
     studentid: "1140002",
     fullname: "宮　内　祥　平",
     fullname_en: "MIYAUCHI SHOUHEI",
     memo: "",
     logname: "b140002",
     wday: "水",
     time: "3" },
  "1140012": 
   { ayear: "2013",
     semester: "秋学期",
     semester_division: "秋学期",
     wdaytime: "水3",
     id_code: "34502",
     title: "政策情報学概論IV",
     teachername: "久保 裕也",
     department_code: "P",
     grade: "3",
     studentid: "1140012",
     fullname: "藤　野　浩　志",
     fullname_en: "FUJINO HIROSHI",
     memo: "",
     logname: "b140012",
     wday: "水",
     time: "3" },
  "1140038": 
   { ayear: "2013",
     semester: "秋学期",
     semester_division: "秋学期",
     wdaytime: "水3",
     id_code: "34502",
     title: "政策情報学概論IV",
     teachername: "久保 裕也",
     department_code: "P",
     grade: "3",
     studentid: "1140038",
     fullname: "川　島　直　希",
     fullname_en: "KAWASHIMA NAOKI",
     memo: "",
     logname: "b140038",
     wday: "水",
     time: "3" },
  "1140042": 
   { ayear: "2013",
     semester: "秋学期",
     semester_division: "秋学期",
     wdaytime: "水3",
     id_code: "34502",
     title: "政策情報学概論IV",
     teachername: "久保 裕也",
     department_code: "P",
     grade: "3",
     studentid: "1140042",
     fullname: "榊　原　　　良",
     fullname_en: "SAKAKIBARA RYO",
     memo: "",
     logname: "b140042",
     wday: "水",
     time: "3" },
  "1140045": 
   { ayear: "2013",
     semester: "秋学期",
     semester_division: "秋学期",
     wdaytime: "水3",
     id_code: "34502",
     title: "政策情報学概論IV",
     teachername: "久保 裕也",
     department_code: "P",
     grade: "3",
     studentid: "1140045",
     fullname: "青　　　貴　大",
     fullname_en: "AO TAKAHIRO",
     memo: "",
     logname: "b140045",
     wday: "水",
     time: "3" },
  "1140050": 
   { ayear: "2013",
     semester: "秋学期",
     semester_division: "秋学期",
     wdaytime: "水3",
     id_code: "34502",
     title: "政策情報学概論IV",
     teachername: "久保 裕也",
     department_code: "P",
     grade: "3",
     studentid: "1140050",
     fullname: "依　田　準　矢",
     fullname_en: "YODA JUNYA",
     memo: "",
     logname: "b140050",
     wday: "水",
     time: "3" },
  "1140051": 
   { ayear: "2013",
     semester: "秋学期",
     semester_division: "秋学期",
     wdaytime: "水3",
     id_code: "34502",
     title: "政策情報学概論IV",
     teachername: "久保 裕也",
     department_code: "P",
     grade: "3",
     studentid: "1140051",
     fullname: "本　橋　晴　奈",
     fullname_en: "MOTOHASHI HARUNA",
     memo: "",
     logname: "b140051",
     wday: "水",
     time: "3" },
  "1140060": 
   { ayear: "2013",
     semester: "秋学期",
     semester_division: "秋学期",
     wdaytime: "水3",
     id_code: "34502",
     title: "政策情報学概論IV",
     teachername: "久保 裕也",
     department_code: "P",
     grade: "3",
     studentid: "1140060",
     fullname: "加　藤　裕　磨",
     fullname_en: "KATOU YUUMA",
     memo: "",
     logname: "b140060",
     wday: "水",
     time: "3" },
  "1140063": 
   { ayear: "2013",
     semester: "秋学期",
     semester_division: "秋学期",
     wdaytime: "水3",
     id_code: "34502",
     title: "政策情報学概論IV",
     teachername: "久保 裕也",
     department_code: "P",
     grade: "3",
     studentid: "1140063",
     fullname: "関　谷　優　太",
     fullname_en: "SEKIYA YUTA",
     memo: "",
     logname: "b140063",
     wday: "水",
     time: "3" },
  "1140068": 
   { ayear: "2013",
     semester: "秋学期",
     semester_division: "秋学期",
     wdaytime: "水3",
     id_code: "34502",
     title: "政策情報学概論IV",
     teachername: "久保 裕也",
     department_code: "P",
     grade: "3",
     studentid: "1140068",
     fullname: "戸井田　翔　子",
     fullname_en: "TOIDA SHOUKO",
     memo: "",
     logname: "b140068",
     wday: "水",
     time: "3" },
  "1140075": 
   { ayear: "2013",
     semester: "秋学期",
     semester_division: "秋学期",
     wdaytime: "水3",
     id_code: "34502",
     title: "政策情報学概論IV",
     teachername: "久保 裕也",
     department_code: "P",
     grade: "3",
     studentid: "1140075",
     fullname: "日　暮　　　歩",
     fullname_en: "HIGURASHI AYUMI",
     memo: "",
     logname: "b140075",
     wday: "水",
     time: "3" },
  "1140076": 
   { ayear: "2013",
     semester: "秋学期",
     semester_division: "秋学期",
     wdaytime: "水3",
     id_code: "34502",
     title: "政策情報学概論IV",
     teachername: "久保 裕也",
     department_code: "P",
     grade: "3",
     studentid: "1140076",
     fullname: "池　田　章　太",
     fullname_en: "IKEDA SHOUTA",
     memo: "",
     logname: "b140076",
     wday: "水",
     time: "3" },
  "1140085": 
   { ayear: "2013",
     semester: "秋学期",
     semester_division: "秋学期",
     wdaytime: "水3",
     id_code: "34502",
     title: "政策情報学概論IV",
     teachername: "久保 裕也",
     department_code: "P",
     grade: "3",
     studentid: "1140085",
     fullname: "千　羽　優　希",
     fullname_en: "CHIBA YUUKI",
     memo: "",
     logname: "b140085",
     wday: "水",
     time: "3" },
  "1140087": 
   { ayear: "2013",
     semester: "秋学期",
     semester_division: "秋学期",
     wdaytime: "水3",
     id_code: "34502",
     title: "政策情報学概論IV",
     teachername: "久保 裕也",
     department_code: "P",
     grade: "3",
     studentid: "1140087",
     fullname: "市　原　悠　貴",
     fullname_en: "ICHIHARA YUUKI",
     memo: "",
     logname: "b140087",
     wday: "水",
     time: "3" },
  "1140100": 
   { ayear: "2013",
     semester: "秋学期",
     semester_division: "秋学期",
     wdaytime: "水3",
     id_code: "34502",
     title: "政策情報学概論IV",
     teachername: "久保 裕也",
     department_code: "P",
     grade: "3",
     studentid: "1140100",
     fullname: "宮　野　峻　一",
     fullname_en: "MIYANO SHUNNICHI",
     memo: "",
     logname: "b140100",
     wday: "水",
     time: "3" },
  "1140107": 
   { ayear: "2013",
     semester: "秋学期",
     semester_division: "秋学期",
     wdaytime: "水3",
     id_code: "34502",
     title: "政策情報学概論IV",
     teachername: "久保 裕也",
     department_code: "P",
     grade: "3",
     studentid: "1140107",
     fullname: "佐　野　　　翼",
     fullname_en: "SANO TSUBASA",
     memo: "",
     logname: "b140107",
     wday: "水",
     time: "3" },
  "1140110": 
   { ayear: "2013",
     semester: "秋学期",
     semester_division: "秋学期",
     wdaytime: "水3",
     id_code: "34502",
     title: "政策情報学概論IV",
     teachername: "久保 裕也",
     department_code: "P",
     grade: "3",
     studentid: "1140110",
     fullname: "宮　内　杏　奈",
     fullname_en: "MIYAUCHI ANNA",
     memo: "",
     logname: "b140110",
     wday: "水",
     time: "3" },
  "1140116": 
   { ayear: "2013",
     semester: "秋学期",
     semester_division: "秋学期",
     wdaytime: "水3",
     id_code: "34502",
     title: "政策情報学概論IV",
     teachername: "久保 裕也",
     department_code: "P",
     grade: "3",
     studentid: "1140116",
     fullname: "岩　澤　朋　紀",
     fullname_en: "IWASAWA TOMOKI",
     memo: "",
     logname: "b140116",
     wday: "水",
     time: "3" },
  "1140120": 
   { ayear: "2013",
     semester: "秋学期",
     semester_division: "秋学期",
     wdaytime: "水3",
     id_code: "34502",
     title: "政策情報学概論IV",
     teachername: "久保 裕也",
     department_code: "P",
     grade: "3",
     studentid: "1140120",
     fullname: "小　堺　佳　乃",
     fullname_en: "KOZAKAI KANO",
     memo: "",
     logname: "b140120",
     wday: "水",
     time: "3" },
  "1140132": 
   { ayear: "2013",
     semester: "秋学期",
     semester_division: "秋学期",
     wdaytime: "水3",
     id_code: "34502",
     title: "政策情報学概論IV",
     teachername: "久保 裕也",
     department_code: "P",
     grade: "3",
     studentid: "1140132",
     fullname: "小　林　沙　織",
     fullname_en: "KOBAYASHI SAORI",
     memo: "",
     logname: "b140132",
     wday: "水",
     time: "3" },
  "1140133": 
   { ayear: "2013",
     semester: "秋学期",
     semester_division: "秋学期",
     wdaytime: "水3",
     id_code: "34502",
     title: "政策情報学概論IV",
     teachername: "久保 裕也",
     department_code: "P",
     grade: "3",
     studentid: "1140133",
     fullname: "笹　川　敦　史",
     fullname_en: "SASAGAWA ATSUSHI",
     memo: "",
     logname: "b140133",
     wday: "水",
     time: "3" },
  "1140140": 
   { ayear: "2013",
     semester: "秋学期",
     semester_division: "秋学期",
     wdaytime: "水3",
     id_code: "34502",
     title: "政策情報学概論IV",
     teachername: "久保 裕也",
     department_code: "P",
     grade: "3",
     studentid: "1140140",
     fullname: "古　村　将　太",
     fullname_en: "FURUMURA SHOUTA",
     memo: "",
     logname: "b140140",
     wday: "水",
     time: "3" },
  "1140147": 
   { ayear: "2013",
     semester: "秋学期",
     semester_division: "秋学期",
     wdaytime: "水3",
     id_code: "34502",
     title: "政策情報学概論IV",
     teachername: "久保 裕也",
     department_code: "P",
     grade: "3",
     studentid: "1140147",
     fullname: "小　椋　大　暉",
     fullname_en: "OGURA DAIKI",
     memo: "",
     logname: "b140147",
     wday: "水",
     time: "3" },
  "1140161": 
   { ayear: "2013",
     semester: "秋学期",
     semester_division: "秋学期",
     wdaytime: "水3",
     id_code: "34502",
     title: "政策情報学概論IV",
     teachername: "久保 裕也",
     department_code: "P",
     grade: "3",
     studentid: "1140161",
     fullname: "村　岡　梓　美",
     fullname_en: "MURAOKA AZUMI",
     memo: "",
     logname: "b140161",
     wday: "水",
     time: "3" },
  "1140173": 
   { ayear: "2013",
     semester: "秋学期",
     semester_division: "秋学期",
     wdaytime: "水3",
     id_code: "34502",
     title: "政策情報学概論IV",
     teachername: "久保 裕也",
     department_code: "P",
     grade: "3",
     studentid: "1140173",
     fullname: "安　達　史央里",
     fullname_en: "ADACHI SHIORI",
     memo: "",
     logname: "b140173",
     wday: "水",
     time: "3" },
  "1140177": 
   { ayear: "2013",
     semester: "秋学期",
     semester_division: "秋学期",
     wdaytime: "水3",
     id_code: "34502",
     title: "政策情報学概論IV",
     teachername: "久保 裕也",
     department_code: "P",
     grade: "3",
     studentid: "1140177",
     fullname: "石　原　寛　也",
     fullname_en: "ISHIHARA HIROYA",
     memo: "",
     logname: "b140177",
     wday: "水",
     time: "3" },
  "1140187": 
   { ayear: "2013",
     semester: "秋学期",
     semester_division: "秋学期",
     wdaytime: "水3",
     id_code: "34502",
     title: "政策情報学概論IV",
     teachername: "久保 裕也",
     department_code: "P",
     grade: "3",
     studentid: "1140187",
     fullname: "宮　根　明日香",
     fullname_en: "MIYANE ASUKA",
     memo: "",
     logname: "b140187",
     wday: "水",
     time: "3" },
  "1140198": 
   { ayear: "2013",
     semester: "秋学期",
     semester_division: "秋学期",
     wdaytime: "水3",
     id_code: "34502",
     title: "政策情報学概論IV",
     teachername: "久保 裕也",
     department_code: "P",
     grade: "3",
     studentid: "1140198",
     fullname: "佐　藤　智　彰",
     fullname_en: "SATO TOMOAKI",
     memo: "",
     logname: "b140198",
     wday: "水",
     time: "3" },
  "1140199": 
   { ayear: "2013",
     semester: "秋学期",
     semester_division: "秋学期",
     wdaytime: "水3",
     id_code: "34502",
     title: "政策情報学概論IV",
     teachername: "久保 裕也",
     department_code: "P",
     grade: "3",
     studentid: "1140199",
     fullname: "益　子　和　樹",
     fullname_en: "MASUKO KAZUKI",
     memo: "",
     logname: "b140199",
     wday: "水",
     time: "3" },
  "1140206": 
   { ayear: "2013",
     semester: "秋学期",
     semester_division: "秋学期",
     wdaytime: "水3",
     id_code: "34502",
     title: "政策情報学概論IV",
     teachername: "久保 裕也",
     department_code: "P",
     grade: "3",
     studentid: "1140206",
     fullname: "柿　崎　　　駿",
     fullname_en: "KAKIZAKI SHUN",
     memo: "",
     logname: "b140206",
     wday: "水",
     time: "3" },
  "1140227": 
   { ayear: "2013",
     semester: "秋学期",
     semester_division: "秋学期",
     wdaytime: "水3",
     id_code: "34502",
     title: "政策情報学概論IV",
     teachername: "久保 裕也",
     department_code: "P",
     grade: "3",
     studentid: "1140227",
     fullname: "島　崎　辰　也",
     fullname_en: "SHIMAZAKI TATSUYA",
     memo: "",
     logname: "b140227",
     wday: "水",
     time: "3" },
  "1140229": 
   { ayear: "2013",
     semester: "秋学期",
     semester_division: "秋学期",
     wdaytime: "水3",
     id_code: "34502",
     title: "政策情報学概論IV",
     teachername: "久保 裕也",
     department_code: "P",
     grade: "3",
     studentid: "1140229",
     fullname: "高　松　　　慧",
     fullname_en: "TAKAMATSU KEI",
     memo: "",
     logname: "b140229",
     wday: "水",
     time: "3" },
  "1240218": 
   { ayear: "2013",
     semester: "秋学期",
     semester_division: "秋学期",
     wdaytime: "水3",
     id_code: "34502",
     title: "政策情報学概論IV",
     teachername: "久保 裕也",
     department_code: "P",
     grade: "4",
     studentid: "1240218",
     fullname: "藤　田　剛　司",
     fullname_en: "FUJITA TSUYOSHI",
     memo: "",
     logname: "b240218",
     wday: "水",
     time: "3" },
  "0940004": 
   { ayear: "2013",
     semester: "秋学期",
     semester_division: "秋学期",
     wdaytime: "水3",
     id_code: "34502",
     title: "政策情報学概論IV",
     teachername: "久保 裕也",
     department_code: "P",
     grade: "4",
     studentid: "0940004",
     fullname: "髙　橋　研　吾",
     fullname_en: "TAKAHASHI KENGO",
     memo: "",
     logname: "a940004",
     wday: "水",
     time: "3" },
  "0940213": 
   { ayear: "2013",
     semester: "秋学期",
     semester_division: "秋学期",
     wdaytime: "水3",
     id_code: "34502",
     title: "政策情報学概論IV",
     teachername: "久保 裕也",
     department_code: "P",
     grade: "4",
     studentid: "0940213",
     fullname: "内　藤　哲　哉",
     fullname_en: "NAITO TETSUYA",
     memo: "",
     logname: "a940213",
     wday: "水",
           time: "3" } 
};


describe("parse_enrollment_data(filename, params)", function(){
        it("should return JSON, when the file etc/2013Autumn/34502.txt is parsed", 
           function(){
               expect(enrollment_data.parse(
                                            'etc/2013Autumn/34502.txt',
                                            {encoding:'CP932', separator:','}
                                            )).toBe(data);
           });
    });
