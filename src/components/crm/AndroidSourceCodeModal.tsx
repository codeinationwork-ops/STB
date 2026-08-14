import React, { useState } from 'react';
import { X, Copy, Check, Code2, Smartphone, Database, Layers, ShieldCheck } from 'lucide-react';

interface AndroidSourceCodeModalProps {
  onClose: () => void;
}

export const AndroidSourceCodeModal: React.FC<AndroidSourceCodeModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'entity' | 'dao' | 'viewmodel' | 'compose' | 'worker'>('compose');
  const [copied, setCopied] = useState(false);

  const codeSnippets = {
    compose: `// DashboardScreen.kt - Jetpack Compose UI
package com.shopscoper.tailor.crm.ui.dashboard

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.shopscoper.tailor.crm.data.OrderEntity

@Composable
fun DashboardScreen(
    orders: List<OrderEntity>,
    onNewOrderClick: () -> Unit,
    onOrderClick: (OrderEntity) -> Unit
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("ShopScoper Tailor CRM", color = Color.White) },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color(0xFF0B4636))
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = onNewOrderClick,
                containerColor = Color(0xFFFFC107)
            ) {
                Icon(Icons.Default.Add, contentDescription = "New Order")
            }
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            items(orders) { order ->
                OrderCardItem(order = order, onClick = { onOrderClick(order) })
            }
        }
    }
}`,
    entity: `// OrderEntity.kt - Room SQLite Database Schema
package com.shopscoper.tailor.crm.data

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "orders")
data class OrderEntity(
    @PrimaryKey val id: String, // e.g. #ORD-2025-1245
    val customerId: String,
    val customerName: String,
    val customerPhone: String,
    val garmentType: String,
    val subTypeStyle: String,
    val totalAmount: Double,
    val advancePaid: Double,
    val balanceDue: Double,
    val status: String, // 'New / Cutting', 'Stitching', 'Completed', 'Delivered'
    val dueDate: String,
    val assignedTailor: String,
    val specialNotes: String?,
    val isOverdue: Boolean = false,
    val isSyncedToCloud: Boolean = false,
    val updatedAt: Long = System.currentTimeMillis()
)`,
    dao: `// OrderDao.kt - Room SQLite DAO
package com.shopscoper.tailor.crm.data

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Dao
interface OrderDao {
    @Query("SELECT * FROM orders ORDER BY updatedAt DESC")
    fun getAllOrders(): Flow<List<OrderEntity>>

    @Query("SELECT * FROM orders WHERE isOverdue = 1")
    fun getOverdueOrders(): Flow<List<OrderEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertOrder(order: OrderEntity)

    @Query("UPDATE orders SET status = :status, updatedAt = :timestamp WHERE id = :orderId")
    suspend fun updateOrderStatus(orderId: String, status: String, timestamp: Long)

    @Query("SELECT * FROM orders WHERE isSyncedToCloud = 0")
    suspend fun getUnsyncedOrders(): List<OrderEntity>
}`,
    viewmodel: `// DashboardViewModel.kt - StateFlow ViewModel Architecture
package com.shopscoper.tailor.crm.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.shopscoper.tailor.crm.data.OrderDao
import com.shopscoper.tailor.crm.data.OrderEntity
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class DashboardViewModel(private val orderDao: OrderDao) : ViewModel() {

    val ordersState: StateFlow<List<OrderEntity>> = orderDao.getAllOrders()
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = emptyList()
        )

    fun createOrder(order: OrderEntity) {
        viewModelScope.launch {
            orderDao.insertOrder(order)
        }
    }
}`,
    worker: `// FirebaseSyncWorker.kt - WorkManager Background Sync
package com.shopscoper.tailor.crm.sync

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.google.firebase.firestore.FirebaseFirestore
import com.shopscoper.tailor.crm.data.OrderDao
import kotlinx.coroutines.tasks.await

class FirebaseSyncWorker(
    appContext: Context,
    workerParams: WorkerParameters,
    private val orderDao: OrderDao,
    private val firestore: FirebaseFirestore
) : CoroutineWorker(appContext, workerParams) {

    override suspend fun doWork(): Result {
        return try {
            val unsynced = orderDao.getUnsyncedOrders()
            for (order in unsynced) {
                firestore.collection("orders").document(order.id).set(order).await()
                orderDao.insertOrder(order.copy(isSyncedToCloud = true))
            }
            Result.success()
        } catch (e: Exception) {
            Result.retry()
        }
    }
}`,
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(codeSnippets[activeTab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col text-slate-100 shadow-2xl overflow-hidden font-mono">
        {/* Modal Header */}
        <div className="p-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#0B4636] text-amber-300">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white font-sans">Android Kotlin Architecture Specs</h3>
              <p className="text-[11px] text-slate-400 font-sans">Jetpack Compose + Room (SQLite) + WorkManager</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Code Tabs */}
        <div className="flex items-center gap-1 p-2 bg-slate-800/60 border-b border-slate-700 overflow-x-auto text-xs font-sans">
          <button
            onClick={() => setActiveTab('compose')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-bold ${
              activeTab === 'compose' ? 'bg-[#0B4636] text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            DashboardScreen.kt (Compose)
          </button>
          <button
            onClick={() => setActiveTab('entity')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-bold ${
              activeTab === 'entity' ? 'bg-[#0B4636] text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            OrderEntity.kt (Room Schema)
          </button>
          <button
            onClick={() => setActiveTab('dao')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-bold ${
              activeTab === 'dao' ? 'bg-[#0B4636] text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            OrderDao.kt (SQLite DAO)
          </button>
          <button
            onClick={() => setActiveTab('viewmodel')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-bold ${
              activeTab === 'viewmodel' ? 'bg-[#0B4636] text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            DashboardViewModel.kt
          </button>
          <button
            onClick={() => setActiveTab('worker')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-bold ${
              activeTab === 'worker' ? 'bg-[#0B4636] text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            FirebaseSyncWorker.kt
          </button>
        </div>

        {/* Code Viewer Body */}
        <div className="p-4 flex-1 overflow-y-auto bg-slate-950 text-emerald-400 text-xs leading-relaxed">
          <pre className="whitespace-pre-wrap">{codeSnippets[activeTab]}</pre>
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-800 border-t border-slate-700 flex items-center justify-between text-xs font-sans">
          <div className="flex items-center gap-2 text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Ready for Android Studio export & Gradle build</span>
          </div>

          <button
            onClick={handleCopy}
            className="px-3 py-1.5 rounded-xl bg-amber-400 text-slate-900 font-extrabold flex items-center gap-1.5 hover:bg-amber-300 transition-all cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-900" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied to Clipboard!' : 'Copy Code'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
