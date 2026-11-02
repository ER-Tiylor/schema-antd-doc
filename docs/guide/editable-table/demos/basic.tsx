import { useState } from 'react';
import { Divider, Typography } from 'antd';
import { EditableTable } from '@tianyr/schema-antd';
import type { EditableColumn } from '@tianyr/schema-antd';

interface Row {
  id: string;
  name: string;
  qty: number;
  status: string;
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
    title: '状态',
    dataIndex: 'status',
    width: 140,
    // 'read'：不参与校验，但值跟随本行 Form（能看到联动写进来的结果）
    editable: 'read',
    field: {
      name: 'status',
      type: 'Select',
      props: {
        options: [
          { value: 'pending', label: '待处理' },
          { value: 'done', label: '已完成' },
        ],
      },
    },
  },
  {
    title: '备注',
    dataIndex: 'remark',
    // false / 缺省：不挂字段，单元格直接读行记录
    editable: false,
  },
];

let seq = 100;

export default function BasicDemo() {
  const [rows, setRows] = useState<Row[]>([
    { id: '1', name: '苹果', qty: 2, status: 'pending', remark: '冷链' },
    { id: '2', name: '香蕉', qty: 5, status: 'done', remark: '' },
  ]);

  return (
    <>
      <EditableTable<Row>
        rowKey="id"
        columns={columns}
        dataSource={rows}
        maxHeight={280}
        // 行内保存：真实项目在这里调接口，这里只替换本地数据
        onSave={async (nextRow, originalRow) => {
          await new Promise((resolve) => setTimeout(resolve, 300));
          setRows((prev) => prev.map((row) => (row.id === originalRow.id ? nextRow : row)));
        }}
        onDelete={(row) => {
          setRows((prev) => prev.filter((item) => item.id !== row.id));
        }}
        // 给了 createRow + onSetData，「新增 / 批量删除」才走这里落地
        createRow={() => {
          seq += 1;
          return { id: String(seq), qty: 1, status: 'pending' };
        }}
        onSetData={(next) => setRows(next)}
        showRowSelection
        showBatchDelete
      />

      <Divider />

      <Typography.Text type="secondary">
        已确认数据（正在编辑的那一行是组件内部草稿，不在这里）：
      </Typography.Text>
      <pre style={{ margin: '8px 0 0', fontSize: 12, lineHeight: 1.6 }}>
        {JSON.stringify(rows, null, 2)}
      </pre>
    </>
  );
}
