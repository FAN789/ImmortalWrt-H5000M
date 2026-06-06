'use strict';
'require view';
'require form';
'require fs';
'require ui';

return view.extend({
	load: function() {
		return fs.exec('/usr/sbin/h5000m-fancontrol', [ 'status' ]).catch(function() {
			return { stdout: '' };
		});
	},

	parseStatus: function(res) {
		var data = {};

		(res.stdout || '').trim().split(/\n/).forEach(function(line) {
			var pos = line.indexOf('=');

			if (pos > -1)
				data[line.substring(0, pos)] = line.substring(pos + 1);
		});

		return data;
	},

	formatTemp: function(value) {
		return value ? _('%s °C').format(value) : _('未知');
	},

	statusTable: function(data) {
		return E('div', { 'class': 'cbi-section' }, [
			E('h3', _('当前状态')),
			E('table', { 'class': 'table' }, [
				E('tr', [ E('td', _('风扇转速')), E('td', data.fan_rpm ? _('%s RPM').format(data.fan_rpm) : _('未知')) ]),
				E('tr', [ E('td', _('当前 PWM')), E('td', data.pwm_value || _('未知')) ]),
				E('tr', [ E('td', _('模块温度')), E('td', this.formatTemp(data.module_temp)) ]),
				E('tr', [ E('td', _('CPU 温度')), E('td', this.formatTemp(data.cpu_temp)) ]),
				E('tr', [ E('td', _('WiFi 温度 1')), E('td', this.formatTemp(data.wifi1_temp)) ]),
				E('tr', [ E('td', _('WiFi 温度 2')), E('td', this.formatTemp(data.wifi2_temp)) ])
			])
		]);
	},

	render: function(res) {
		var m, s, o;
		var status = this.parseStatus(res);

		m = new form.Map('h5000m_fancontrol', _('风扇控制'));
		m.description = _('调节 PWM 风扇策略。');

		s = m.section(form.NamedSection, 'settings', 'settings');
		s.anonymous = true;

		o = s.option(form.Flag, 'enabled', _('启用'));
		o.default = '1';
		o.rmempty = false;

		o = s.option(form.ListValue, 'mode', _('模式'));
		o.value('auto', _('自动'));
		o.value('manual', _('手动'));
		o.value('off', _('关闭'));
		o.default = 'auto';
		o.rmempty = false;

		o = s.option(form.Value, 'manual_pwm', _('手动 PWM'));
		o.datatype = 'range(0,255)';
		o.default = '160';

		o = s.option(form.Value, 'min_pwm', _('最低 PWM'));
		o.datatype = 'range(0,255)';
		o.default = '80';

		o = s.option(form.Value, 'max_pwm', _('最高 PWM'));
		o.datatype = 'range(0,255)';
		o.default = '255';

		o = s.option(form.Value, 'low_temp', _('低温阈值'));
		o.datatype = 'range(0,120)';
		o.default = '45';

		o = s.option(form.Value, 'high_temp', _('高温阈值'));
		o.datatype = 'range(1,120)';
		o.default = '70';

		o = s.option(form.Value, 'interval', _('刷新间隔'));
		o.datatype = 'range(5,300)';
		o.default = '15';

		m.handleSaveApply = function(ev, mode) {
			return form.Map.prototype.handleSaveApply.apply(this, [ ev, mode ]).then(function() {
				return fs.exec('/usr/sbin/h5000m-fancontrol', [ 'apply' ]).then(function() {
					return fs.exec('/etc/init.d/h5000m-fancontrol', [ 'restart' ]);
				}).then(function() {
					ui.addNotification(null, E('p', _('风扇控制已应用。')));
				}, function(err) {
					ui.addNotification(null, E('p', _('风扇控制应用失败：') + err.message), 'danger');
				});
			});
		};

		return m.render().then(L.bind(function(node) {
			return E('div', {}, [ this.statusTable(status), node ]);
		}, this));
	}
});
