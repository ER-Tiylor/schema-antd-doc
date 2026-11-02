import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Divider, Typography, message } from 'antd';
import { FullEditableTable } from '@tianyr/schema-antd';
import type { EditableColumn, FullEditableTableRef } from '@tianyr/schema-antd';

interface Row {
  id: string;
  name: string;
  qty: number;
  price: number;
  amount: number;
}

const columns: EditableColumn<Row>[] = [
  {
    title: '品名',
    dataIndex: 'name',
    width: 180,
    editable: true,
    field: {
      name: 'name',
      type: 'Input',
      props: { placeholder: '请输入品名' },
      rules: [{ required: true, message: '请填写品名' }],
    },
  },
  {
    title: '数量',
    dataIndex: 'qty',
    width: 140,
    editable: true,
    field: {
      name: 'qty',
      type: 'InputNumber',
      props: { min: 1, precision: 0, style: { width: '100%' } },
      rules: [{ required: true, message: '请填写数量' }],
    },
  },
  {
    title: '单价',
    dataIndex: 'price',
    width: 140,
    editable: true,
    field: {
      name: 'price',
      type: 'InputNumber',
      props: { min: 0, precision: 2, style: { width: '100%' } },
      rules: [{ required: true, message: '请填写单价' }],
    },
  },
  {
    title: '金额（自动算）',
    dataIndex: 'amount',
    width: 160,
    // 'read' 不参与校验，但挂在行 Form 上，能看到 linkage 写进来的值
    editable: 'read',
    field: {
      name: 'amount',
      type: 'InputNumber',
      props: { precision: 2, disabled: true },
      linkage: [
        {
          dependencies: ['qty', 'price'],
          // immediate：进入页面、新增行、程序赋值也重算
          immediate: true,
          handler: ({ get, set }) => {
            const amount = Number(get('qty') ?? 0) * Number(get('price') ?? 0);
            set('amount', Number(amount.toFixed(2)));
          },
        },
      ],
    },
  },
];

const INITIAL_ROWS: Row[] = [
  { id: '1', name: '苹果', qty: 2, price: 12.5, amount: 25 },
  { id: '2', name: '香蕉', qty: 5, price: 6, amount: 30 },
];

let seq = 100;

export default function BasicDemo() {
  const ref = useRef<FullEditableTableRef<Row>>(null);
  const [snapshot, setSnapshot] = useState<Row[]>([]);

  // 每行都有自己的 Form，当前值只能通过 ref 读取
  const refresh = useCallback(() => {
    setSnapshot(ref.current?.getDataSync() ?? []);
  }, []);

  useEffect(() => {
    // 首帧之后 ref 才就绪
    refresh();
  }, [refresh]);

  return (
    <>
      <FullEditableTable<Row>
        ref={ref}
        rowKey="id"
        columns={columns}
        initialRows={INITIAL_ROWS}
        createRow={() => {
          seq += 1;
          return { id: String(seq), qty: 1, price: 0, amount: 0 };
        }}
        // 任意一行的值变化后，等联动写完再回读
        onRowValuesChange={() => {
          setTimeout(refresh, 0);
        }}
        onRowsStructureChange={refresh}
        // 整表校验通过后回调，真实项目在这里调提交接口
        onSubmit={(rows) => {
          message.success(`提交成功，共 ${rows.length} 行`);
        }}
        actionColumnProps={{ fixed: 'right' }}
      />

      <Divider />

      <Button size="small" onClick={refresh} style={{ marginBottom: 8 }}>
        刷新下方数据
      </Button>
      <br />
      <Typography.Text type="secondary">
        来自 `ref.getDataSync()`（每行 Form 的当前值）：
      </Typography.Text>
      <pre style={{ margin: '8px 0 0', fontSize: 12, lineHeight: 1.6 }}>
        {JSON.stringify(snapshot, null, 2)}
      </pre>
    </>
  );
}
