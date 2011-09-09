package sample.app;

import android.os.Bundle;

import com.phonegap.DroidGap;

public class SampleActivity extends DroidGap {
	
	@Override
	public void onCreate(Bundle savedInstanceState) {
		super.onCreate(savedInstanceState);
		super.loadUrl("file:///android_asset/index.html");
	}
	
}
