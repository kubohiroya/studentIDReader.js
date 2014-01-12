/* jslint node: true */
/* global $, FormData */

"use strict";

$(function () {
    var uploadFiles = function (files) {
        // FormData オブジェクトを用意
        var fd = new FormData();

        // ファイル情報を追加する
        for (var i = 0; i < files.length; i++) {
            fd.append("files", files[i]);
        }

        // XHR で送信
        $.ajax({
            url: "http://" + window.location.hostname + ":" + window.location.port + "/upload",
            type: "POST",
            data: fd,
            processData: false,
            contentType: false
        });
    };

    // ファイル選択フォームからの入力
    $("#form").bind("change", function () {
        // 選択されたファイル情報を取得
        var files = this.files;

        // アップロード処理
        uploadFiles(files);
    });

    // ドラッグドロップからの入力
    $("div.dropTarget").bind("drop", function (e) {
        // ドラッグされたファイル情報を取得
        var files = e.originalEvent.dataTransfer.files;

        // アップロード処理
        uploadFiles(files);
        return false;
    })
        .bind("dragenter", function () {
            // false を返してデフォルトの処理を実行しないようにする
            $('div.dropTarget').addClass('dragEnter');
            return false;
        })
        .bind("dragover", function () {
            // false を返してデフォルトの処理を実行しないようにする
            $('div.dropTarget').addClass('dragOver');
            return false;
        });
});