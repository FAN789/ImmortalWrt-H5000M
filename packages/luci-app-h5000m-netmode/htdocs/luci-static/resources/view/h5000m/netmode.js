'use strict';
'require view';
'require form';
'require fs';
'require ui';

return view.extend({
	load: function() {
		return fs.exec('/usr/sbin/h5000m-netmode', [ 'status' ]).catch(function() {
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

	statusTable: function(data) {
		var labels = {
			wan_first: _('有线 WAN 优先，5G 备用'),
			modem_first: _('5G 模块优先，有线 WAN 备用'),
			wan_only: _('仅有线 WAN'),
			modem_only: _('仅 5G 模块')
		};
		var mode = labels[data.mode] || labels.wan_first;

		return E('div', { 'class': 'cbi-section' }, [
			E('h3', _('当前状态')),
			E('table', { 'class': 'table' }, [
				E('tr', [ E('td', _('当前模式')), E('td', mode) ]),
				E('tr', [ E('td', _('IPv4 默认出口')), E('td', data.active4 || _('未知')) ]),
				E('tr', [ E('td', _('IPv6 默认出口')), E('td', data.active6 || _('无')) ]),
				E('tr', [ E('td', _('有线 WAN metric')), E('td', '%s / %s'.format(data.wan_metric || '-', data.wan6_metric || '-')) ]),
				E('tr', [ E('td', _('5G 模块 metric')), E('td', '%s / %s'.format(data.usb_metric || '-', data.usbv6_metric || '-')) ]),
				E('tr', [ E('td', _('有线 WAN 默认路由')), E('td', '%s / %s'.format(data.wan_defaultroute == '0' ? _('关闭') : _('开启'), data.wan6_defaultroute == '0' ? _('关闭') : _('开启'))) ]),
				E('tr', [ E('td', _('5G 模块默认路由')), E('td', '%s / %s'.format(data.usb_defaultroute == '0' ? _('关闭') : _('开启'), data.usbv6_defaultroute == '0' ? _('关闭') : _('开启'))) ])
			])
		]);
	},

	render: function(res) {
		var m, s, o;
		var status = this.parseStatus(res);

		m = new form.Map('h5000m_netmode', _('出口优先级'));
		m.description = _('切换有线 WAN 与 5G 模块的默认出口优先级。');

		s = m.section(form.NamedSection, 'settings', 'settings');
		s.anonymous = true;

		o = s.option(form.ListValue, 'mode', _('出口模式'));
		o.value('wan_first', _('有线 WAN 优先，5G 备用'));
		o.value('modem_first', _('5G 模块优先，有线 WAN 备用'));
		o.value('wan_only', _('仅有线 WAN'));
		o.value('modem_only', _('仅 5G 模块'));
		o.default = 'wan_first';
		o.rmempty = false;

		m.handleSaveApply = function(ev, mode) {
			return form.Map.prototype.handleSaveApply.apply(this, [ ev, mode ]).then(function() {
				return fs.exec('/usr/sbin/h5000m-netmode', [ 'apply' ]).then(function() {
					ui.addNotification(null, E('p', _('出口优先级已应用。')));
				}, function(err) {
					ui.addNotification(null, E('p', _('出口优先级应用失败：') + err.message), 'danger');
				});
			});
		};

		return m.render().then(L.bind(function(node) {
			return E('div', {}, [ this.statusTable(status), node ]);
		}, this));
	}
});
