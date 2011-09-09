// Application の定義
// Sencha Touch MVC に基づいた 5つの namespace が作られる
// e.g: App, App.models, App.views, App.controllers, App.stores
Ext.regApplication('App', {
    defaultUrl: 'list',
    launch: function(){
        // launch がフレームワークによって呼ばれてしまう為、
        // PhoneGap API の初期化が完了していなかったら、一度初期化をキャンセルし、
        // deviceready イベントによって呼ばれるのを待つ
        // また、Chrome であれば、デバッグ用に PhoneGap API の状態に関わらず初期化を実行する
        if(typeof device === 'undefined' && !Ext.is.Desktop) return;

        console.log('launched');
        this.viewport = new this.Viewport({ application: this });
    }
});

// Proxy の定義
// Store に読み込む為の read 関数を定義する
// ここでは read のみ定義しているが、create, update, delete などを定義する事ができる
Ext.data.ProxyMgr.registerType('ContactProxy', Ext.extend(Ext.data.Proxy, {
    _attrs: [ 'id',
              'name',
              'emails',
              'phoneNumbers'
            ], // 取得する属性の指定
    _opts: { multiple: true }, // 1件だけでなく複数件取得する

    read: function(operation, callback, scope){
        var proxy = this;

        // 本当はインスタンスメソッドとして持ってもいい
        function onSuccess(contacts){
            contacts = contacts || [];
            console.log(contacts.length + ' contacts loaded.');

            // モデルとなるオブジェクトを作成
            var models = [];
            for(var i=0; i<contacts.length; i++){
                var c = contacts[i];
                models.push(new proxy.model({
                    id: c.id,
                    name: c.name.formatted,
                    givenName: c.name.givenName,
                    familyName: c.name.familyName,
                    phoneNumbers: c.phoneNumbers,
                    emails: c.emails
                }));
            }

            // 結果セットを定義
            operation.resultSet = new Ext.data.ResultSet({
                records: models,
                total  : models.length,
                loaded : true
            });

            // 読み込みが成功した事を通知する
            operation.setSuccessful();
            operation.setCompleted();

            // コールバックが定義されていれば呼ぶ
            if (typeof callback === 'function') {
                callback.call(scope || proxy, operation);
            }
        }

        function onError(e){
            console.error(e);
        }

        // PhoneGap API を利用してコンタクトの一覧を取得
        navigator.contacts.find(this._attrs, onSuccess, onError, this._opts);
    }
}));

// Model の定義
// フィールドや、フィールドのデータ型などを定義する
Ext.regModel('Contact', {
    fields: [
        {name: 'id', type: 'int'},
        {name: 'name', type: 'string'},
        {name: 'givenName', type: 'string'},
        {name: 'familyName', type: 'string'},
        {name: 'phoneNumbers', type: 'auto'},
        {name: 'emails', type: 'auto'}
    ],
    proxy: {
        type: 'ContactProxy'
    }
});

// Store の定義
// Model のコレクションを保持する
Ext.regStore('ContactStore', {
    model: 'Contact',
    sorters: 'familyName'
});

// View の定義
// App.store.ContactStore をデータストアとする
App.views.ContactList = Ext.extend(Ext.Panel, {
    dockedItems: [{
        xtype: 'toolbar',
        title: 'Contacts'
    }],
    layout: 'fit',
    items: [{
        xtype: 'list',
        store: Ext.getStore('ContactStore'),
        itemTpl: '{name}',
        disableSelection: true,
        onItemDisclosure: function(record){
            App.views.contactList.select(record);
        },
        listeners: {
            itemtap: function(view, index){
                var record = this.store.getAt(index);
                App.views.contactList.select(record);
            }
        }
    }],
    initComponent: function() {
        Ext.getStore('ContactStore').load();
        App.views.ContactList.superclass.initComponent.apply(this, arguments);
    },

    select: function(record){
        console.log('selected: ' + record.getId());
        Ext.dispatch({
            controller: Ext.ControllerManager.get('contacts'),
            action: 'show',
            historyUrl: 'detail',
            id: record.getId()
        });
    }
});

// 詳細画面の定義
App.views.ContactDetail = Ext.extend(Ext.Panel, {
    dockedItems: [{
        xtype: 'toolbar',
        title: 'Contact Detail'
    }],
    cls: 'contact-detail',
    styleHtmlContent: true,
    scroll: 'vertical',
    items: [
        {tpl:[
            '<h4>電話番号</h4>',
            '<tpl for="phoneNumbers">',
                '<div class="field"><span class="label">{type}: </span><a href="tel:{value}">{value}</a></div>',
            '</tpl>'
        ]},
        {tpl:[
            '<h4>メールアドレス</h4>',
            '<tpl for="emails">',
                '<div class="field"><span class="label">{type}: </span><a href="mailto:{value}">{value}</a></div>',
            '</tpl>'
        ]}
    ],
    updateWithRecord: function(record){
        Ext.each(this.items.items, function(item) {
            item.update(record.data);
        });
        var toolbar = this.getDockedItems()[0];
        toolbar.setTitle(record.get('name'));
    }
});

// ViewPort の定義
// 一覧画面とこれから定義する詳細画面の各 View のインスタンスを保持する
App.Viewport = Ext.extend(Ext.Panel, {
    fullscreen: true,
    layout: 'card',
    cardSwitchAnimation: 'slide',
    initComponent: function() {
        Ext.apply(App.views, {
            contactList: new App.views.ContactList(),
            contactDetail: new App.views.ContactDetail()
        });

        Ext.apply(this, {
            items: [
                App.views.contactList,
                App.views.contactDetail
            ]
        });
        App.Viewport.superclass.initComponent.apply(this, arguments);
    }
});

// Controller の定義
App.controllers.Contacts = Ext.regController('contacts', {
    index: function(options){
        console.log('[contacts/index]');

        App.viewport.setActiveItem(App.views.contactList, options.animation);
    },

    show: function(options){
        console.log('[contacts/show] ' + options.id);
        var id = parseInt(options.id),
            contact = Ext.getStore('ContactStore').getById(id);

        if(contact){
            App.views.contactDetail.updateWithRecord(contact);
            App.viewport.setActiveItem(App.views.contactDetail, options.animation);
        }
    }
});

Ext.Router.draw(function(map) {
    map.connect('list', { controller: 'contacts', action: 'index' });
    map.connect('detail', { controller: 'contacts', action: 'show' });
});

// Chrome デバッグ用
if(Ext.is.Desktop){
    navigator.contacts = {
        find :function(attr, success, error, opts){
            success([
                {
                    id: 0,
                    name: {
                        formatted: '鈴木 一郎',
                        givenName: '一郎',
                        familyName: '鈴木'
                    },
                    phoneNumbers: [ {
                        type: 'Home',
                        value: '000-0000-0000'
                    } ] ,
                    emails: [ {
                        type: 'Home',
                        value: 'ichiro_suzuki@dwangoo.co.jp'
                    }]
                },
                {
                    id: 0,
                    name: {
                        formatted: '鈴木 花子',
                        givenName: '花子',
                        familyName: '鈴木'
                    },
                    phoneNumbers: [ '000-0000-0001' ] ,
                    emails: [ 'hanako_suzuki@dwangoo.co.jp' ]
                }
            ]);
        }
    };
}

// PhoneGap API を利用する為、Sencha Toutch で一般的な Ext.onReady, Ext.Application.launch でなく、
// PhoneGap API が初期化された後に呼ばれる deviceready イベントを初期化のトリガーとする。
document.addEventListener('deviceready', App.launch, true)
