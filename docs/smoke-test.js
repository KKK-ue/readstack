/* 逻辑层冒烟测试：在 Node 中直接跑 store.js / charts.js（不依赖 DOM） */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const base = path.join(__dirname, '..', 'assets', 'js');
const sandbox = { console, Math, Date, JSON, performance: { now: () => 0 } };
sandbox.window = sandbox;
sandbox.global = sandbox;
sandbox.document = { createElement: () => ({ getContext: () => ({ drawImage() {} }), toDataURL: () => 'data:,' }) };
sandbox.CustomEvent = function (n) { this.type = n; };
sandbox.dispatchEvent = () => {};
vm.createContext(sandbox);

['store.js', 'charts.js'].forEach(f => {
  vm.runInContext(fs.readFileSync(path.join(base, f), 'utf8'), sandbox, { filename: f });
});

const { RS, Charts } = sandbox;
let pass = 0, fail = 0;
const ok = (cond, msg) => { cond ? (pass++, console.log('  PASS ' + msg)) : (fail++, console.log('  FAIL ' + msg)); };

console.log('\n[1] 存储降级与初始化');
ok(RS.Backup.persistent() === false, 'Node 环境自动降级为内存存储');
RS.seed();
ok(RS.Stock.all().length === 8, '示例库存 8 条 → ' + RS.Stock.all().length);
ok(RS.Reading.all().length === 6, '示例阅读 6 条 → ' + RS.Reading.all().length);

console.log('\n[2] 两库隔离性');
const sk = RS.Stock.all().find(b => b.title === '百年孤独');
RS.Stock.update(sk.id, { title: '百年孤独（改）', status: 'drop' });
const rd = RS.Reading.all().find(b => b.title === '百年孤独');
ok(!!rd, '修改库存后，已读清单同名记录仍存在且标题未变');
ok(rd.rating === 5, '已读记录评分未被库存改动影响');
RS.Reading.remove(rd.id);
ok(RS.Stock.get(sk.id) !== null, '删除阅读记录不影响库存记录');
RS.Reading.add({ title: '百年孤独', author: '加西亚·马尔克斯', category: '文学', rating: 5, finishDate: rd.finishDate, startDate: rd.startDate, excerpts: rd.excerpts, reflection: rd.reflection });

console.log('\n[3] 摘抄 CRUD');
const t = RS.Reading.all()[0];
const ex = RS.Reading.addExcerpt(t.id, '测试摘抄内容', '99');
ok(RS.Reading.get(t.id).excerpts.some(e => e.id === ex.id), '新增摘抄成功');
RS.Reading.updateExcerpt(t.id, ex.id, '已修改', '100');
ok(RS.Reading.get(t.id).excerpts.find(e => e.id === ex.id).text === '已修改', '修改摘抄成功');
RS.Reading.removeExcerpt(t.id, ex.id);
ok(!RS.Reading.get(t.id).excerpts.some(e => e.id === ex.id), '删除摘抄成功');

console.log('\n[4] 报告口径');
const all = RS.Reading.all();
const sum = RS.Report.summary(all);
ok(sum.books === all.length, '全域本数 = ' + sum.books);
ok(sum.avgRating > 0 && sum.avgRating <= 5, '平均评分合法 = ' + sum.avgRating);
ok(sum.avgDays > 0, '本均天数 = ' + sum.avgDays + ' 天');
const Y = String(new Date().getFullYear());
ok(RS.Report.scope(Y).length === all.filter(b => b.finishDate.slice(0, 4) === Y).length, '年度筛选口径正确');
ok(RS.Report.monthlyOfYear(Y).reduce((a, b) => a + b, 0) === RS.Report.scope(Y).length, '月度分布合计 = 年度总量');
const noDate = RS.Reading.add({ title: '未填读完日', category: '其他', rating: 3 });
ok(RS.Report.scope(Y).length === all.filter(b => b.finishDate.slice(0, 4) === Y).length, '未填读完日期的记录不进入年度报告');
ok(RS.Report.summary(RS.Reading.all()).books === all.length + 1, '但计入全域总量');
RS.Reading.remove(noDate.id);

console.log('\n[5] 偏好分析');
const ins = RS.Report.insight(RS.Reading.all());
ok(ins && ins.topCat && ins.topRatio > 0, '生成偏好结论：最爱「' + ins.topCat + '」占 ' + ins.topRatio + '%');
ok(ins.cats.length > 0 && ins.avgRating > 0, '关键词与均分可用');

console.log('\n[6] 全局检索');
const r = RS.Search('孤独');
ok(r.stock.length + r.reading.length > 0, '书名命中 ' + (r.stock.length + r.reading.length) + ' 条');
const r2 = RS.Search('虚构');
ok(r2.excerpts.length > 0, '摘抄全文命中 ' + r2.excerpts.length + ' 条');
const r3 = RS.Search('课题分离');
ok(r3.reflections.length > 0, '感悟全文命中 ' + r3.reflections.length + ' 条');
ok(RS.Search('').stock.length === 0, '空关键词不返回结果');

console.log('\n[7] 备份 / 恢复');
const json = RS.Backup.export();
const snapS = RS.Stock.all().length, snapR = RS.Reading.all().length;
RS.Backup.clearAll();
ok(RS.Stock.all().length === 0 && RS.Reading.all().length === 0, '清空成功');
RS.Backup.import(json, 'cover');
ok(RS.Stock.all().length === snapS && RS.Reading.all().length === snapR, '覆盖恢复成功 ' + snapS + '/' + snapR);
RS.Backup.import(json, 'merge');
ok(RS.Stock.all().length === snapS, '合并导入按 id 去重，无重复膨胀');
let bad = false; try { RS.Backup.import('{"app":"Other"}', 'cover'); } catch (e) { bad = true; }
ok(bad, '非法备份文件被拒绝');

console.log('\n[8] 图表输出');
const cats = RS.Report.byCategory(RS.Reading.all());
ok(Charts.donut(cats, { size: 128 }).startsWith('<svg'), '环形图生成 SVG');
ok(Charts.bars([1, 2, 3], ['a', 'b', 'c']).includes('<rect'), '柱状图生成');
ok(Charts.line([{ name: '2024', value: 3 }, { name: '2025', value: 8 }]).includes('<path'), '折线图生成');
ok(Charts.heatmap('2026-08', { 3: 1, 9: 2 }).includes('heat-cell'), '热力图生成');
ok(Charts.esc('<img onerror=x>') === '&lt;img onerror=x&gt;', 'XSS 转义生效');

console.log('\n[9] 边界值');
ok(RS.daysBetween('2026-01-01', '2026-01-01') === 1, '同日读完记为 1 天');
ok(RS.daysBetween('2026-02-10', '2026-01-01') === 0, '逆序日期返回 0');
ok(RS.daysBetween('', '2026-01-01') === 0, '缺失日期返回 0');
ok(RS.Report.summary([]).books === 0, '空列表汇总不报错');
ok(RS.Report.insight([]) === null, '空列表不生成偏好结论');
ok(Charts.donut([], {}) === '', '空数据环形图返回空串');

console.log('\n================  ' + pass + ' passed, ' + fail + ' failed  ================\n');
process.exit(fail ? 1 : 0);
