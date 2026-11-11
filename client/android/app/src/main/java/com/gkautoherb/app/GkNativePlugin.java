package com.gkautoherb.app;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.firebase.FirebaseApp;

/** Tells the web app whether Firebase is set up, so push is only used when it won't crash. */
@CapacitorPlugin(name = "GkNative")
public class GkNativePlugin extends Plugin {
    @PluginMethod
    public void pushAvailable(PluginCall call) {
        boolean ok;
        try {
            ok = !FirebaseApp.getApps(getContext()).isEmpty();
        } catch (Throwable t) {
            ok = false;
        }
        JSObject ret = new JSObject();
        ret.put("available", ok);
        call.resolve(ret);
    }
}
