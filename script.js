function plugindo_taskvisualization(){
    if(getElementsByClass('plugin_do1',null,'span').length ||
       getElementsByClass('plugin_do2',null,'span').length ||
       getElementsByClass('plugin_do3',null,'span').length ||
       getElementsByClass('plugin_do4',null,'span').length){

        var ajax = new sack(DOKU_BASE + 'lib/exe/ajax.php');
            ajax.AjaxFailedAlert = '';
            ajax.encodeURIString = false;
        if(ajax.failed) return true;

        ajax.setVar('do_page', JSINFO['id']);
        ajax.setVar('call','plugin_do_status');

        ajax.onCompletion = function(){
            var resp = 'var stat = '+this.response;
            eval(resp);

            for(var i=0; i<stat.length; i++){
                var obj = document.getElementById('plgdo__'+stat[i].md5);
                if(obj){
                    obj.className += ' plugin_do_done';
                    obj.title += ' '+LANG['plugins']['do']['done'].replace(/%s/,stat[i].status);
                }
            }
        };
        ajax.runAJAX();
    }
}

addInitEvent(function(){

    // Status toggle
    var slinks = getElementsByClass('plugin_do_status',null,'a');
    for(var i=0; i<slinks.length; i++){
        addEvent(slinks[i],'click',function(e){
            var me = e.target;
            if(me.tagName != 'A') me = e.target.parentNode;
            var param = me.search.substring(1).replace(/&do=/,'&call=');


            var ajax = new sack(DOKU_BASE + 'lib/exe/ajax.php');
            ajax.AjaxFailedAlert = '';
            ajax.encodeURIString = false;
            if(ajax.failed) return true;

            ajax._image = me.firstChild;
            ajax._image.src = DOKU_BASE+'lib/plugins/do/pix/throbber.gif';
            ajax._image.title = '...';

            ajax.onCompletion = function(){
                var resp = this.response;
                if(resp){
                    this._image.src   = DOKU_BASE+'lib/plugins/do/pix/status_done.png';
                    this._image.title = LANG['plugins']['do']['done'].replace(/%s/,resp);
                }else{
                    this._image.src   = DOKU_BASE+'lib/plugins/do/pix/status_open.png';
                    this._image.title = LANG['plugins']['do']['open'];
                }
            };

            ajax.runAJAX(param);


            e.preventDefault();
            e.stopPropagation();
            return false;
        });
    }

    plugindo_taskvisualization();
});

